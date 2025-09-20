#!/bin/bash

# Monitoring script for the Enxero Platform Backend
# Can be run as a cron job for continuous monitoring

set -e

LOG_FILE="/var/log/enxero-monitoring.log"
APP_URL="http://localhost:3000"
ALERT_EMAIL="admin@your-domain.com"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a $LOG_FILE
}

# Function to send alert (implement your preferred notification method)
send_alert() {
    local message="$1"
    log "ALERT: $message"
    
    # Email alert (requires mail command)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "Enxero Backend Alert" $ALERT_EMAIL
    fi
    
    # Slack webhook (uncomment and configure)
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"$message\"}" \
    #   YOUR_SLACK_WEBHOOK_URL
}

# Check application health
check_app_health() {
    local status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$APP_URL/health" || echo "000")
    
    if [ "$status" = "200" ]; then
        log "✅ Application health check passed"
        return 0
    else
        log "❌ Application health check failed (HTTP $status)"
        send_alert "Application health check failed with status $status"
        return 1
    fi
}

# Check PM2 process
check_pm2_process() {
    if pm2 list | grep -q "enxero-backend.*online"; then
        log "✅ PM2 process is running"
        return 0
    else
        log "❌ PM2 process is not running"
        send_alert "PM2 process for enxero-backend is not running"
        
        # Attempt to restart
        log "🔄 Attempting to restart PM2 process..."
        pm2 restart enxero-backend || pm2 start /var/www/enxero-backend/current/ecosystem.config.js
        return 1
    fi
}

# Check Nginx status
check_nginx() {
    if sudo systemctl is-active --quiet nginx; then
        log "✅ Nginx is running"
        return 0
    else
        log "❌ Nginx is not running"
        send_alert "Nginx service is down"
        
        # Attempt to restart
        log "🔄 Attempting to restart Nginx..."
        sudo systemctl start nginx
        return 1
    fi
}

# Check database connectivity
check_database() {
    if sudo -u postgres pg_isready -d enxero_production &>/dev/null; then
        log "✅ Database is accessible"
        return 0
    else
        log "❌ Database is not accessible"
        send_alert "PostgreSQL database is not accessible"
        return 1
    fi
}

# Check disk space
check_disk_space() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        log "✅ Disk usage is normal ($usage%)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log "⚠️  Disk usage is high ($usage%)"
        send_alert "Disk usage is high: $usage%"
        return 1
    else
        log "❌ Disk usage is critical ($usage%)"
        send_alert "CRITICAL: Disk usage is at $usage%"
        return 1
    fi
}

# Check memory usage
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -lt 80 ]; then
        log "✅ Memory usage is normal ($usage%)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log "⚠️  Memory usage is high ($usage%)"
        return 1
    else
        log "❌ Memory usage is critical ($usage%)"
        send_alert "CRITICAL: Memory usage is at $usage%"
        return 1
    fi
}

# Check SSL certificate expiry (if using HTTPS)
check_ssl_expiry() {
    local domain="your-domain.com"
    
    if command -v openssl &> /dev/null; then
        local expiry_date=$(echo | openssl s_client -servername $domain -connect $domain:443 2>/dev/null | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        if [ "$days_until_expiry" -gt 30 ]; then
            log "✅ SSL certificate is valid ($days_until_expiry days remaining)"
            return 0
        elif [ "$days_until_expiry" -gt 7 ]; then
            log "⚠️  SSL certificate expires soon ($days_until_expiry days)"
            send_alert "SSL certificate expires in $days_until_expiry days"
            return 1
        else
            log "❌ SSL certificate expires very soon ($days_until_expiry days)"
            send_alert "URGENT: SSL certificate expires in $days_until_expiry days"
            return 1
        fi
    fi
}

# Main monitoring function
main() {
    log "🔍 Starting monitoring check..."
    
    local failed_checks=0
    
    check_app_health || ((failed_checks++))
    check_pm2_process || ((failed_checks++))
    check_nginx || ((failed_checks++))
    check_database || ((failed_checks++))
    check_disk_space || ((failed_checks++))
    check_memory || ((failed_checks++))
    check_ssl_expiry || ((failed_checks++))
    
    if [ $failed_checks -eq 0 ]; then
        log "🎉 All monitoring checks passed"
    else
        log "⚠️  $failed_checks monitoring checks failed"
    fi
    
    log "✅ Monitoring check completed"
}

# Run monitoring
main

# Exit with appropriate code
exit $failed_checks