# Spenicle

> Simplify Spending, Maximize Savings

A modern expense tracking and financial management application built with TypeScript, Express.js, React, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Setup Environment

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd spenicle
   ```

2. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env.dev
   
   # Edit the development environment file
   nano .env.dev
   ```
   
   **Important**: Update the `API_JWT_SECRET` with a strong, unique secret key.

3. **Start all services:**
   ```bash
   # Using the convenience script (recommended)
   ./scripts/local up
   
   # Or directly with docker-compose
   docker-compose -f docker-compose.dev.yml --env-file .env.dev up --build -d
   ```

3. **Access the applications:**
   - **Web App (React)**: http://localhost:8080
   - **API (Express)**: http://localhost:3000
   - **PostgreSQL**: localhost:5432

4. **Stop the services:**
   ```bash
   # Using the convenience script
   ./scripts/local down
   
   # Or directly with docker-compose
   docker-compose -f docker-compose.dev.yml --env-file .env.dev down
   ```

### Development Scripts

The project includes convenient scripts for managing the development environment:

```bash
# Start all services
./scripts/local up

# Stop all services
./scripts/local down

# Rebuild a specific service (e.g., after code changes)
./scripts/local rebuild api
./scripts/local rebuild web

# View logs
./scripts/local logs

# Restart services
./scripts/local restart

# Clean cache and rebuild (useful for dependency updates)
./scripts/local clean-cache

# Database operations
./scripts/local backup-db    # Creates backup.sql
./scripts/local restore-db   # Restores from backup.sql
```

## 🏗️ What's Included

- **PostgreSQL 16**: Database server
- **Express.js API**: Backend service with TypeScript
- **React Web App**: Frontend with Vite and TypeScript
- **Development Tools**: Hot reloading, migrations, and testing setup

## 🚦 Production Deployment (with SSL & Domain)

### Prerequisites
- Docker and Docker Compose
- Domain name with DNS configured
- SSL certificates (see below)

### 1. Environment Setup

```bash
# Copy and configure production environment
cp .env.example .env.prod
nano .env.prod
```

**Important variables to update in `.env.prod`:**
- `API_JWT_SECRET` - Use a strong, unique secret for production
- `API_BASE_URL` - Update to your production API endpoint
- Database credentials if different from defaults

### 2. Prepare SSL Certificates

Use the SSL certificate generator script:
```bash
./scripts/generate-ssl.sh
```

**Options available:**
- **Let's Encrypt (Recommended)**: Free SSL certificates for production
- **Existing Certificates**: Use your own SSL certificates  
- **Self-signed**: For development/testing only

**For production with domain `dimasbaguspm.com`:**
1. Ensure DNS A records point to your VPS:
   - `dimasbaguspm.com` → YOUR_VPS_IP
   - `spenicle.dimasbaguspm.com` → YOUR_VPS_IP  
   - `spenicle-api.dimasbaguspm.com` → YOUR_VPS_IP

2. Run the SSL generator and choose option 1 (Let's Encrypt)

3. Follow the provided commands to set up certificates on your VPS

### 3. Start Production Services
```bash
# Using the convenience script (recommended)
./scripts/staging up

# Or directly with docker-compose
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 4. Production Scripts

Similar to development, but for staging/production environment:

```bash
# Start all production services
./scripts/staging up

# Stop all services
./scripts/staging down

# Rebuild services
./scripts/staging rebuild api
./scripts/staging rebuild web

# View logs
./scripts/staging logs

# Restart services
./scripts/staging restart

# Clean cache and rebuild
./scripts/staging clean-cache

# Database operations
./scripts/staging backup-db
./scripts/staging restore-db
```

### 3. Access Your Application
- **Landing Page**: https://dimasbaguspm.com
- **Web App**: https://spenicle.dimasbaguspm.com  
- **API Documentation**: https://spenicle-api.dimasbaguspm.com/api/docs

## 🧪 Staging Deployment (for testing)

### Prerequisites
- Docker and Docker Compose
- SSL certificates (self-signed for testing)

### 1. Environment Setup
```bash
# Copy and configure staging environment (can use same as prod)
cp .env.example .env.prod
nano .env.prod
```

### 2. Generate Self-Signed Certificates
```bash
./scripts/generate-ssl.sh
```
Choose option 3 for self-signed certificates (testing only).

### 3. Start Staging Services
```bash
./scripts/staging up
```
- Access via your VPS IP with HTTPS (will show security warnings for self-signed certs)

## 🔧 Environment Configuration

This project uses environment files to manage configuration across different environments:

### Environment Files
- **`.env.example`** - Template with all required variables
- **`.env.dev`** - Development environment (not committed to git)
- **`.env.prod`** - Production environment (not committed to git)

### Key Environment Variables

**API Configuration:**
- `NODE_ENV` - Environment mode (development/production)
- `API_PORT` - Port for the API server (default: 3000)
- `API_JWT_SECRET` - Secret key for JWT tokens (⚠️ **Must be unique per environment**)
- `API_BASE_URL` - Base URL for API calls

**Database Configuration:**
- `API_PGHOST` - PostgreSQL host (default: postgres)
- `API_PGUSER` - PostgreSQL username (default: postgres)
- `API_PGPASSWORD` - PostgreSQL password (default: postgres)
- `API_PGDATABASE` - PostgreSQL database name (default: spenicle)
- `API_DATABASE_URL` - Complete database connection string

**Web Configuration:**
- `WEB_PORT` - Port for the web server (default: 8080)
- `API_BASE_URL` - Base URL for API calls

### Security Notes
- Never commit `.env.dev` or `.env.prod` files to version control
- Use strong, unique secrets for each environment
- Rotate secrets regularly in production

## 📄 License

This project is licensed under the AGPL-3.0 License.

## 👤 Author

Dimas Bagus Prayogo Mukti <dimas.bagus.pm@gmail.com>
