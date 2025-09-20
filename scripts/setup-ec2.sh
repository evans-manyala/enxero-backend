#!/bin/bash

# EC2 Setup Script for Enxero Platform Backend
# Run this script on your EC2 instance to set up the environment

set -e

echo "🚀 Setting up EC2 instance for Enxero Platform Backend..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Create application directory
sudo mkdir -p /var/www/enxero-backend
sudo chown -R $USER:$USER /var/www/enxero-backend

# Create PM2 log directory
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Setup PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE enxero_production;"
sudo -u postgres psql -c "CREATE USER enxero WITH ENCRYPTED PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE enxero_production TO enxero;"
sudo -u postgres psql -c "ALTER USER enxero CREATEDB;"

# Configure Nginx
sudo tee /etc/nginx/sites-available/enxero-backend > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml;

    # API routes
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # API documentation
    location /api-docs {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000;
        access_log off;
    }

    # File uploads (if serving static files)
    location /uploads/ {
        alias /var/www/enxero-backend/current/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Security for uploaded files
        location ~* \.(php|jsp|asp|sh|py|pl|exe)$ {
            deny all;
        }
    }

    # Default location
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/enxero-backend /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start and enable services
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Setup PM2 startup script
pm2 startup
echo "⚠️  Run the command that PM2 outputs above to complete the startup setup"

# Setup firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ EC2 setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Update the Nginx server_name with your actual domain"
echo "2. Set up SSL certificate with Let's Encrypt (optional but recommended)"
echo "3. Configure your GitHub repository secrets"
echo "4. Update the database connection string"
echo "5. Run the PM2 startup command that was displayed above"
echo ""
echo "🔐 Required GitHub Secrets:"
echo "- EC2_SSH_KEY: Your EC2 private key"
echo "- EC2_HOST: Your EC2 public IP or domain"
echo "- EC2_USER: EC2 username (usually 'ubuntu' or 'ec2-user')"
echo "- DATABASE_URL: PostgreSQL connection string"
echo "- JWT_SECRET: JWT secret key"
echo "- JWT_REFRESH_SECRET: JWT refresh secret key"
echo "- CORS_ORIGIN: Allowed CORS origins"
echo "- APP_URL: Your application URL for health checks"
echo "- PORT: Application port (default: 3000)"