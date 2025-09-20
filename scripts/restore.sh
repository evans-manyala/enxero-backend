#!/bin/bash

# Restore script for database and application files
# Usage: ./restore.sh backup-name

set -e

BACKUP_NAME=$1
BACKUP_DIR="/var/backups/enxero"
APP_DIR="/var/www/enxero-backend"

if [ -z "$BACKUP_NAME" ]; then
    echo "Usage: ./restore.sh backup-name"
    echo "Available backups:"
    ls -la $BACKUP_DIR/ | grep backup- || echo "No backups found"
    exit 1
fi

echo "🔄 Restoring from backup: $BACKUP_NAME..."

# Verify backup files exist
if [ ! -f "$BACKUP_DIR/db-$BACKUP_NAME.sql" ]; then
    echo "❌ Database backup not found: $BACKUP_DIR/db-$BACKUP_NAME.sql"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/app-$BACKUP_NAME.tar.gz" ]; then
    echo "❌ Application backup not found: $BACKUP_DIR/app-$BACKUP_NAME.tar.gz"
    exit 1
fi

# Stop application
echo "⏹️  Stopping application..."
pm2 delete enxero-backend || true

# Backup current state before restore
echo "💾 Creating safety backup..."
SAFETY_BACKUP="safety-$(date +%Y%m%d-%H%M%S)"
sudo -u postgres pg_dump enxero_production > /tmp/db-$SAFETY_BACKUP.sql
sudo mv /tmp/db-$SAFETY_BACKUP.sql $BACKUP_DIR/

if [ -d "$APP_DIR/current" ]; then
    sudo tar -czf $BACKUP_DIR/app-$SAFETY_BACKUP.tar.gz -C $APP_DIR current/
fi

# Restore database
echo "🗄️  Restoring database..."
sudo -u postgres dropdb enxero_production || true
sudo -u postgres createdb enxero_production
sudo -u postgres psql enxero_production < $BACKUP_DIR/db-$BACKUP_NAME.sql

# Restore application files
echo "📁 Restoring application files..."
if [ -d "$APP_DIR/current" ]; then
    sudo mv $APP_DIR/current $APP_DIR/current-backup-$(date +%Y%m%d-%H%M%S)
fi

sudo mkdir -p $APP_DIR/current
sudo tar -xzf $BACKUP_DIR/app-$BACKUP_NAME.tar.gz -C $APP_DIR/current/
sudo chown -R $USER:$USER $APP_DIR/current

# Restore uploads if available
if [ -f "$BACKUP_DIR/uploads-$BACKUP_NAME.tar.gz" ]; then
    echo "📎 Restoring uploads..."
    sudo tar -xzf $BACKUP_DIR/uploads-$BACKUP_NAME.tar.gz -C $APP_DIR/current/
fi

# Restore environment file if available
if [ -f "$BACKUP_DIR/env-$BACKUP_NAME.txt" ]; then
    echo "⚙️  Restoring environment configuration..."
    sudo cp $BACKUP_DIR/env-$BACKUP_NAME.txt $APP_DIR/current/.env
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd $APP_DIR/current
npm ci --only=production

# Start application
echo "🚀 Starting application..."
pm2 start ecosystem.config.js
pm2 save

# Restore Nginx configuration if available
if [ -f "$BACKUP_DIR/nginx-$BACKUP_NAME.conf" ]; then
    echo "🌐 Restoring Nginx configuration..."
    sudo cp $BACKUP_DIR/nginx-$BACKUP_NAME.conf /etc/nginx/sites-available/enxero-backend
    sudo nginx -t
    sudo systemctl reload nginx
fi

echo "✅ Restore completed successfully!"
echo "🏥 Health check: curl http://localhost/health"
echo "💾 Safety backup created: $SAFETY_BACKUP"