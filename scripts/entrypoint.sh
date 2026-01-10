#!/bin/sh
set -e


echo "Starting Spenicle services..."
echo "Backend API: http://0.0.0.0:${APP_PORT}"
echo "Web Frontend: http://0.0.0.0:${WEB_PORT}"

# Start supervisord (config is copied to /etc/supervisord.conf)
exec /usr/bin/supervisord -c /etc/supervisord.conf
