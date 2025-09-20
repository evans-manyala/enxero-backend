#!/bin/bash

# Backup script for database and application files
# Usage: ./backup.sh [backup-name]

set -e

BACKUP_NAME=${1:-"backup-$(date +%Y%m%d-%H%M%S)"}
BACKUP_DIR="/var/backups/enxero"
APP_DIR="/var/www/enxero-backend/current"

echo "📦 Creating backup: $BACKUP_NAME..."

# Create backup directory
sudo mkdir -p $BACKUP_DIR

# Database backup
echo "🗄️  Backing up database..."
sudo -u postgres pg_dump enxero_production > /tmp/db-$BACKUP_NAME.sql
sudo mv /tmp/db-$BACKUP_NAME.sql $BACKUP_DIR/

# Application files backup
echo "📁 Backing up application files..."
sudo tar -czf $BACKUP_DIR/app-$BACKUP_NAME.tar.gz -C $APP_DIR .

# Uploads backup
echo "📎 Backing up uploads..."
if [ -d "$APP_DIR/uploads" ]; then
    sudo tar -czf $BACKUP_DIR/uploads-$BACKUP_NAME.tar.gz -C $APP_DIR uploads/
fi

# Configuration backup
echo "⚙️  Backing up configuration..."
sudo cp /etc/nginx/sites-available/enxero-backend $BACKUP_DIR/nginx-$BACKUP_NAME.conf
sudo cp $APP_DIR/.env $BACKUP_DIR/env-$BACKUP_NAME.txt 2>/dev/null || echo "No .env file found"

# Create backup manifest
sudo tee $BACKUP_DIR/manifest-$BACKUP_NAME.txt > /dev/null <<EOF
Backup created: $(date)
Database: db-$BACKUP_NAME.sql
Application: app-$BACKUP_NAME.tar.gz
Uploads: uploads-$BACKUP_NAME.tar.gz
Nginx config: nginx-$BACKUP_NAME.conf
Environment: env-$BACKUP_NAME.txt
EOF

# Set permissions
sudo chown -R $USER:$USER $BACKUP_DIR

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "*backup-*" -type f -mtime +7 -delete 2>/dev/null || true

echo "✅ Backup completed: $BACKUP_DIR/$BACKUP_NAME"
echo "📋 Backup contents:"
ls -la $BACKUP_DIR/*$BACKUP_NAME*