#!/bin/bash

# Health check script for monitoring deployment
# Can be used in monitoring systems or cron jobs

set -e

APP_URL=${1:-"http://localhost:3000"}
TIMEOUT=${2:-10}

echo "🏥 Performing health check on $APP_URL..."

# Check application health endpoint
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$APP_URL/health" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Application is healthy (HTTP $HTTP_STATUS)"
    
    # Check API endpoint
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$APP_URL/api/v1/health" || echo "000")
    
    if [ "$API_STATUS" = "200" ]; then
        echo "✅ API is healthy (HTTP $API_STATUS)"
    else
        echo "❌ API is unhealthy (HTTP $API_STATUS)"
        exit 1
    fi
    
    # Check database connectivity (if health endpoint includes DB check)
    DB_CHECK=$(curl -s --max-time $TIMEOUT "$APP_URL/health" | grep -o '"database":"ok"' || echo "")
    
    if [ -n "$DB_CHECK" ]; then
        echo "✅ Database connection is healthy"
    else
        echo "⚠️  Database status unknown"
    fi
    
    echo "🎉 All systems operational!"
    exit 0
else
    echo "❌ Application is unhealthy (HTTP $HTTP_STATUS)"
    
    # Additional diagnostics
    echo "🔍 Running diagnostics..."
    
    # Check if PM2 process is running
    if command -v pm2 &> /dev/null; then
        echo "📊 PM2 Status:"
        pm2 list | grep enxero-backend || echo "PM2 process not found"
    fi
    
    # Check if port is listening
    if command -v netstat &> /dev/null; then
        echo "🔌 Port Status:"
        netstat -tlnp | grep :3000 || echo "Port 3000 not listening"
    fi
    
    # Check system resources
    echo "💾 System Resources:"
    free -h
    df -h /
    
    exit 1
fi