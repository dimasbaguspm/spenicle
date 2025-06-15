#!/usr/bin/env bash

# Generate nginx configuration from template using environment variables
# This script processes the nginx.prod.conf.template file and replaces
# environment variable placeholders with actual values

echo "🔧 Generating nginx configuration from template..."

# Load environment variables from .env.prod if it exists
if [ -f .env.prod ]; then
  export $(grep -v '^#' .env.prod | grep -v '^$' | xargs)
fi

# Set default values if environment variables are not set
export DOMAIN_BASE="${DOMAIN_BASE:-example.com}"
export DOMAIN_APP_SUBDOMAIN="${DOMAIN_APP_SUBDOMAIN:-spenicle}"
export DOMAIN_API_SUBDOMAIN="${DOMAIN_API_SUBDOMAIN:-spenicle-api}"

# Check if template exists
if [ ! -f "nginx/nginx.prod.conf.template" ]; then
  echo "❌ Template file nginx/nginx.prod.conf.template not found!"
  exit 1
fi

echo "📋 Using domain configuration:"
echo "   - Base domain: $DOMAIN_BASE"
echo "   - App subdomain: $DOMAIN_APP_SUBDOMAIN"
echo "   - API subdomain: $DOMAIN_API_SUBDOMAIN"

# Process template and generate nginx configuration
if ! sed -e "s/\${DOMAIN_BASE}/$DOMAIN_BASE/g" \
    -e "s/\${DOMAIN_APP_SUBDOMAIN}/$DOMAIN_APP_SUBDOMAIN/g" \
    -e "s/\${DOMAIN_API_SUBDOMAIN}/$DOMAIN_API_SUBDOMAIN/g" \
    nginx/nginx.prod.conf.template > nginx/nginx.prod.conf; then
  echo "❌ Failed to process template!"
  exit 1
fi

# Verify the generated file is valid
if [ ! -s "nginx/nginx.prod.conf" ]; then
  echo "❌ Generated nginx configuration is empty!"
  exit 1
fi

echo "✅ Nginx configuration generated successfully!"
echo "📁 Configuration saved to: nginx/nginx.prod.conf"
echo "📊 File size: $(du -h nginx/nginx.prod.conf | cut -f1)"
