#!/bin/bash

# Rollback script for emergency rollbacks
# Usage: ./rollback.sh [backup-timestamp]

set -e

BACKUP_DIR=${1}

if [ -z "$BACKUP_DIR" ]; then
    echo "Usage: ./rollback.sh backup-YYYYMMDD-HHMMSS"
    echo "Available backups:"
    ssh -i $EC2_SSH_KEY_PATH $EC2_USER@$EC2_HOST "ls -la /var/www/enxero-backend/ | grep backup-"
    exit 1
fi

echo "🔄 Rolling back to $BACKUP_DIR..."

# Load environment variables
if [ -f ".env.production" ]; then
    source .env.production
else
    echo "⚠️  Environment file .env.production not found"
    exit 1
fi

# Perform rollback on EC2
ssh -i $EC2_SSH_KEY_PATH $EC2_USER@$EC2_HOST "
    cd /var/www/enxero-backend
    
    # Check if backup exists
    if [ ! -d '$BACKUP_DIR' ]; then
        echo '❌ Backup directory $BACKUP_DIR not found'
        exit 1
    fi
    
    # Stop current application
    pm2 delete enxero-backend || true
    
    # Backup current deployment
    if [ -d 'current' ]; then
        sudo mv current rollback-backup-$(date +%Y%m%d-%H%M%S) || true
    fi
    
    # Restore from backup
    sudo cp -r $BACKUP_DIR current
    sudo chown -R $USER:$USER current/
    
    # Start application
    cd current
    pm2 start ecosystem.config.js
    pm2 save
    
    echo '✅ Rollback completed successfully!'
"

echo "✅ Rollback to $BACKUP_DIR completed!"
echo "🏥 Health check: curl https://$EC2_HOST/health"