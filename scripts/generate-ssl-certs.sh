#!/usr/bin/env bash
set -e

# Generate self-signed SSL certificates for staging
SSL_DIR="./nginx/ssl"

echo "Generating self-signed SSL certificates for staging..."

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key
openssl genrsa -out "$SSL_DIR/privkey.pem" 2048

# Generate certificate signing request
openssl req -new -key "$SSL_DIR/privkey.pem" -out "$SSL_DIR/cert.csr" -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in "$SSL_DIR/cert.csr" -signkey "$SSL_DIR/privkey.pem" -out "$SSL_DIR/fullchain.pem"

# Clean up CSR file
rm "$SSL_DIR/cert.csr"

echo "SSL certificates generated successfully!"
echo "  Private key: $SSL_DIR/privkey.pem"
echo "  Certificate: $SSL_DIR/fullchain.pem"
