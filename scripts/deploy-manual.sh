#!/bin/bash

# Manual deployment script for emergency deployments
# Usage: ./deploy-manual.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🚀 Starting manual deployment to $ENVIRONMENT..."

# Build the application
echo "📦 Building application..."
npm run build

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p deploy
cp -r dist deploy/
cp -r prisma deploy/
cp package*.json deploy/
cp ecosystem.config.js deploy/
tar -czf deployment-$TIMESTAMP.tar.gz -C deploy .
rm -rf deploy

echo "📦 Deployment package created: deployment-$TIMESTAMP.tar.gz"

# Load environment variables
if [ -f ".env.$ENVIRONMENT" ]; then
    source .env.$ENVIRONMENT
else
    echo "⚠️  Environment file .env.$ENVIRONMENT not found"
    echo "Please ensure you have the following environment variables set:"
    echo "- EC2_HOST"
    echo "- EC2_USER"
    echo "- EC2_SSH_KEY_PATH"
    exit 1
fi

# Deploy to EC2
echo "🚀 Deploying to EC2..."
scp -i $EC2_SSH_KEY_PATH deployment-$TIMESTAMP.tar.gz $EC2_USER@$EC2_HOST:/tmp/

ssh -i $EC2_SSH_KEY_PATH $EC2_USER@$EC2_HOST "
    # Navigate to application directory
    cd /var/www/enxero-backend
    
    # Backup current deployment
    if [ -d 'current' ]; then
        sudo mv current backup-$TIMESTAMP || true
    fi
    
    # Extract new deployment
    sudo mkdir -p current
    sudo tar -xzf /tmp/deployment-$TIMESTAMP.tar.gz -C current/
    sudo chown -R $USER:$USER current/
    
    # Install dependencies
    cd current
    npm ci --only=production
    
    # Run database migrations
    npx prisma migrate deploy
    
    # Restart application
    pm2 delete enxero-backend || true
    pm2 start ecosystem.config.js
    pm2 save
    
    # Clean up
    rm -f /tmp/deployment-$TIMESTAMP.tar.gz
    
    echo '✅ Deployment completed successfully!'
"

# Clean up local deployment package
rm -f deployment-$TIMESTAMP.tar.gz

echo "✅ Manual deployment to $ENVIRONMENT completed!"
echo "🏥 Health check: curl https://$EC2_HOST/health"