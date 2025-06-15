#!/bin/bash

# SSL Certificate Generator
# Unified script for generating SSL certificates for all environments

echo "🔐 SSL Certificate Generator for Spenicle"
echo "=========================================="
echo ""
echo "This script provides comprehensive SSL certificate setup"
echo "for development, testing, and production environments."
echo ""

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

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
    echo "# Get certificates for your domains"
    echo "sudo certbot certonly --standalone -d dimasbaguspm.com -d spenicle.dimasbaguspm.com -d spenicle-api.dimasbaguspm.com"
    echo ""
    echo "# Copy certificates to your project"
    echo "sudo cp /etc/letsencrypt/live/dimasbaguspm.com/fullchain.pem $(pwd)/nginx/ssl/"
    echo "sudo cp /etc/letsencrypt/live/dimasbaguspm.com/privkey.pem $(pwd)/nginx/ssl/"
    echo "sudo chown \$USER:\$USER $(pwd)/nginx/ssl/*.pem"
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
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout nginx/ssl/privkey.pem \
      -out nginx/ssl/fullchain.pem \
      -subj "/C=US/ST=State/L=City/O=Organization/CN=dimasbaguspm.com" \
      -addext "subjectAltName=DNS:dimasbaguspm.com,DNS:spenicle.dimasbaguspm.com,DNS:spenicle-api.dimasbaguspm.com"
    
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
echo "   - dimasbaguspm.com → YOUR_VPS_IP"
echo "   - spenicle.dimasbaguspm.com → YOUR_VPS_IP"
echo "   - spenicle-api.dimasbaguspm.com → YOUR_VPS_IP"
echo ""
echo "2. Deploy your application:"
echo "   docker-compose -f docker-compose.prod.yml up -d --build"
echo ""
echo "3. Your services will be available at:"
echo "   🌐 https://dimasbaguspm.com (Landing page)"
echo "   📱 https://spenicle.dimasbaguspm.com (Web app)"
echo "   🔧 https://spenicle-api.dimasbaguspm.com/api/docs (API docs)"
echo ""
echo "📖 For more detailed instructions, see the main README.md"
echo ""
