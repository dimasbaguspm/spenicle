#!/usr/bin/env bash

# SSL Certificate Generator
# Unified script for generating SSL certificates for all environments

echo "🔐 SSL Certificate Generator for Spenicle"
echo "=========================================="
echo ""
echo "This script provides comprehensive SSL certificate setup"
echo "for development, testing, and production environments."
echo ""

# Load environment variables from .env.prod if it exists
if [ -f .env.prod ]; then
  # Export variables for use in this script
  export $(grep -v '^#' .env.prod | xargs)
fi

# Get domain configuration from environment variables with defaults
DOMAIN_BASE="${DOMAIN_BASE:-example.com}"
DOMAIN_APP_SUBDOMAIN="${DOMAIN_APP_SUBDOMAIN:-spenicle}"
DOMAIN_API_SUBDOMAIN="${DOMAIN_API_SUBDOMAIN:-spenicle-api}"

# Construct full domain names for subdomains only
APP_DOMAIN="$DOMAIN_APP_SUBDOMAIN.$DOMAIN_BASE"
API_DOMAIN="$DOMAIN_API_SUBDOMAIN.$DOMAIN_BASE"

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

echo "Domain Configuration:"
echo "- App domain: $APP_DOMAIN"
echo "- API domain: $API_DOMAIN"
echo ""
echo "ℹ️  Note: This setup only covers subdomains. You can use any other"
echo "   server/service for your main domain ($DOMAIN_BASE)."
echo ""
echo "You have several options for SSL certificates:"
echo ""
echo "1. 🚀 Recommended: Use Certbot (Let's Encrypt) - FREE"
echo "2. 📁 Use existing certificates"
echo "3. 🧪 Generate self-signed certificates (for testing only)"
echo ""

read -p "Choose an option (1-3): " option

case $option in
  1)
    echo ""
    echo "🚀 Setting up Let's Encrypt with Certbot..."
    echo ""
    echo "Please run these commands on your VPS:"
    echo ""
    echo "# Install certbot"
    echo "sudo apt update"
    echo "sudo apt install certbot python3-certbot-nginx"
    echo ""
    echo "# Get certificates for your subdomains"
    echo "sudo certbot certonly --standalone -d $APP_DOMAIN -d $API_DOMAIN"
    echo ""
    echo "# Copy certificates to your project"
    echo "sudo cp /etc/letsencrypt/live/$APP_DOMAIN/fullchain.pem \$(pwd)/nginx/ssl/"
    echo "sudo cp /etc/letsencrypt/live/$APP_DOMAIN/privkey.pem \$(pwd)/nginx/ssl/"
    echo "sudo chown \$USER:\$USER \$(pwd)/nginx/ssl/*.pem"
    echo ""
    echo "📝 Note: Remember to set up automatic renewal:"
    echo "sudo crontab -e"
    echo "# Add this line for automatic renewal:"
    echo "0 12 * * * /usr/bin/certbot renew --quiet"
    ;;
  2)
    echo ""
    echo "📁 Using existing certificates..."
    echo ""
    echo "Please place your SSL certificates in the nginx/ssl/ directory:"
    echo "- fullchain.pem (certificate + intermediate certificates)"
    echo "- privkey.pem (private key)"
    echo ""
    echo "Make sure the files have the correct permissions:"
    echo "chmod 644 nginx/ssl/fullchain.pem"
    echo "chmod 600 nginx/ssl/privkey.pem"
    ;;
  3)
    echo ""
    echo "🧪 Generating self-signed certificates (testing only)..."
    echo ""
    
    # Generate self-signed certificate for subdomains only
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout nginx/ssl/privkey.pem \
      -out nginx/ssl/fullchain.pem \
      -subj "/C=US/ST=State/L=City/O=Organization/CN=$APP_DOMAIN" \
      -addext "subjectAltName=DNS:$APP_DOMAIN,DNS:$API_DOMAIN"
    
    echo "✅ Self-signed certificates generated!"
    echo "⚠️  WARNING: These are for testing only and will show security warnings in browsers."
    ;;
  *)
    echo "Invalid option. Exiting."
    exit 1
    ;;
esac

echo ""
echo "🎯 Next steps:"
echo "1. Make sure your DNS A records point to your VPS IP:"
echo "   - $APP_DOMAIN → YOUR_VPS_IP"
echo "   - $API_DOMAIN → YOUR_VPS_IP"
echo "   (Main domain $DOMAIN_BASE can point anywhere you want)"
echo ""
echo "2. Deploy your application:"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "3. Your services will be available at:"
echo "   📱 https://$APP_DOMAIN (Web app)"
echo "   🔧 https://$API_DOMAIN/api/docs (API docs)"
echo "   🌐 $DOMAIN_BASE (Configure separately - not handled by this nginx)"
echo ""
echo "📖 For more detailed instructions, see the main README.md"
echo ""
