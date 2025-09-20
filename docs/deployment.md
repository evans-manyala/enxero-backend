# Deployment Guide

This guide covers deploying the Enxero Platform Backend to an EC2 instance with Nginx as a reverse proxy.

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04 LTS or later)
- Domain name (optional but recommended)
- GitHub repository with the codebase
- Basic knowledge of Linux command line

## Quick Start

### 1. EC2 Instance Setup

1. Launch an EC2 instance with Ubuntu 20.04 LTS
2. Configure security groups to allow:
   - SSH (port 22) from your IP
   - HTTP (port 80) from anywhere
   - HTTPS (port 443) from anywhere
3. Connect to your instance via SSH

### 2. Initial Server Setup

Run the setup script on your EC2 instance:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/enxero-platform-backend/main/scripts/setup-ec2.sh | bash
```

Or manually copy and run the `scripts/setup-ec2.sh` script.

### 3. Configure GitHub Secrets

In your GitHub repository, go to Settings > Secrets and variables > Actions, and add:

- `EC2_SSH_KEY`: Your EC2 private key (entire content of .pem file)
- `EC2_HOST`: Your EC2 public IP or domain name
- `EC2_USER`: EC2 username (usually 'ubuntu')
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Strong JWT secret key
- `JWT_REFRESH_SECRET`: Strong JWT refresh secret key
- `CORS_ORIGIN`: Allowed CORS origins (your frontend URL)
- `APP_URL`: Your application URL for health checks
- `PORT`: Application port (default: 3000)

### 4. Deploy

Push to the `main` branch to trigger automatic deployment:

```bash
git push origin main
```

## Manual Deployment

For emergency deployments or when CI/CD is not available:

```bash
# Make the script executable
chmod +x scripts/deploy-manual.sh

# Deploy to production
./scripts/deploy-manual.sh production
```

## SSL Setup (Recommended)

After initial deployment, set up SSL with Let's Encrypt:

```bash
# On your EC2 instance
chmod +x scripts/ssl-setup.sh
./scripts/ssl-setup.sh dev.enxero.com
```

## Monitoring and Maintenance

### Check Application Status

```bash
# On EC2 instance
pm2 status
pm2 logs enxero-backend
pm2 monit
```

### Check Nginx Status

```bash
sudo systemctl status nginx
sudo nginx -t  # Test configuration
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Database Maintenance

```bash
# Connect to PostgreSQL
sudo -u postgres psql enxero_production

# Backup database
pg_dump -U enxero -h localhost enxero_production > backup_$(date +%Y%m%d).sql

# Restore database
psql -U enxero -h localhost enxero_production < backup_file.sql
```

### Application Logs

```bash
# PM2 logs
pm2 logs enxero-backend --lines 100

# System logs
sudo journalctl -u nginx -f
sudo journalctl -f
```

## Rollback

In case of deployment issues:

```bash
# List available backups
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-host "ls -la /var/www/enxero-backend/ | grep backup-"

# Rollback to a specific backup
./scripts/rollback.sh backup-20240101-120000
```

## Docker Deployment (Alternative)

If you prefer Docker deployment:

```bash
# Build and run with Docker Compose
cd docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Performance Optimization

### Nginx Optimization

Edit `/etc/nginx/nginx.conf`:

```nginx
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_comp_level 6;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# Enable caching
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m;
```

### PM2 Optimization

Update `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "enxero-backend",
      script: "./dist/server.js",
      instances: "max", // Use all CPU cores
      exec_mode: "cluster",
      max_memory_restart: "1G",
      node_args: "--max-old-space-size=1024",
    },
  ],
};
```

## Security Considerations

1. **Firewall**: Only allow necessary ports (22, 80, 443)
2. **SSH**: Use key-based authentication, disable password auth
3. **SSL**: Always use HTTPS in production
4. **Database**: Use strong passwords, limit connections
5. **Environment Variables**: Never commit secrets to version control
6. **Updates**: Keep system packages updated

## Troubleshooting

### Common Issues

1. **Application won't start**

   ```bash
   pm2 logs enxero-backend
   # Check for missing environment variables or database connection issues
   ```

2. **Nginx 502 Bad Gateway**

   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   # Check if the application is running on the correct port
   ```

3. **Database connection issues**

   ```bash
   # Test database connection
   psql -U enxero -h localhost -d enxero_production
   ```

4. **Permission issues**
   ```bash
   # Fix file permissions
   sudo chown -R ubuntu:ubuntu /var/www/enxero-backend
   ```

### Health Checks

- Application: `curl http://dev.enxero.com/health`
- API: `curl http://dev.enxero.com/api/v1/health`
- Database: Check PM2 logs for connection status

## Scaling

For high-traffic scenarios:

1. **Load Balancer**: Use AWS Application Load Balancer
2. **Database**: Consider RDS for managed PostgreSQL
3. **Caching**: Implement Redis for session storage
4. **CDN**: Use CloudFront for static assets
5. **Auto Scaling**: Set up EC2 Auto Scaling Groups

## Backup Strategy

1. **Database**: Daily automated backups
2. **Application**: Keep last 5 deployment versions
3. **Uploads**: Sync to S3 bucket
4. **Configuration**: Version control all config files

## Support

For deployment issues:

- Check the GitHub Actions logs
- Review application logs via PM2
- Monitor system resources with `htop`
- Check disk space with `df -h`
