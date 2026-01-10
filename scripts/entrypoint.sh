#!/bin/sh
set -e

# Entrypoint for Spenicle container. Expects runtime environment variables
# (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD,
# APP_PORT, WEB_PORT) to be provided by `docker run -e ...` or compose.

WEB_PORT=${WEB_PORT:-3000}
APP_PORT=${APP_PORT:-8080}

echo "Starting Spenicle services..."
echo "Backend API: http://0.0.0.0:${APP_PORT}"
echo "Web Frontend: http://0.0.0.0:${WEB_PORT}"

# Start supervisord (config is copied to /etc/supervisord.conf)
exec /usr/bin/supervisord -c /etc/supervisord.conf
