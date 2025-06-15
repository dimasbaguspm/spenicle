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
   ./scripts/local.sh up
   
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
   ./scripts/local.sh down
   
   # Or directly with docker-compose
   docker-compose -f docker-compose.dev.yml --env-file .env.dev down
   ```

### Development Scripts

The project includes convenient scripts for managing the development environment:

**Note**: Each script will display environment information (compose file, environment file, and docker command) and validate that required files exist before executing any operations. If any required files are missing, the script will exit with an error message.

```bash
# Start all services
./scripts/local.sh up

# Stop all services
./scripts/local.sh down

# Rebuild a specific service (e.g., after code changes)
./scripts/local.sh rebuild api
./scripts/local.sh rebuild web

# View logs
./scripts/local.sh logs

# Restart services
./scripts/local.sh restart

# Clean cache and rebuild (useful for dependency updates)
./scripts/local.sh clean-cache

# Database operations
./scripts/local.sh backup-db    # Creates backup.sql
./scripts/local.sh restore-db   # Restores from backup.sql
```

## 🏗️ What's Included

- **PostgreSQL 16**: Database server
- **Express.js API**: Backend service with TypeScript
- **React Web App**: Frontend with Vite and TypeScript
- **Development Tools**: Hot reloading, migrations, and testing setup

## 🔧 Environment Configuration

This project uses environment files to manage configuration across different environments.

### Environment Files
- **`.env.example`** - Template with all required variables
- **`.env.dev`** - Development environment (not committed to git)
- **`.env.prod`** - Production environment (not committed to git)

### Key Environment Variables

**Domain Configuration (Production):**
- `DOMAIN_BASE` - Your main domain (e.g., `example.com`)
- `DOMAIN_APP_SUBDOMAIN` - Subdomain for web app (default: `spenicle`)
- `DOMAIN_API_SUBDOMAIN` - Subdomain for API (default: `spenicle-api`)

**API Configuration:**
- `NODE_ENV` - Environment mode (development/production)
- `API_PORT` - Port for the API server (default: 3000)
- `API_JWT_SECRET` - Secret key for JWT tokens (⚠️ **Must be unique per environment**)

**Database Configuration:**
- `API_PGHOST` - PostgreSQL host (default: postgres)
- `API_PGUSER` - PostgreSQL username (default: postgres)
- `API_PGPASSWORD` - PostgreSQL password (default: postgres)
- `API_PGDATABASE` - PostgreSQL database name (default: spenicle)
- `API_DATABASE_URL` - Complete database connection string

**Web Configuration:**
- `WEB_PORT` - Port for the web server (default: 8080)
- `VITE_API_BASE_URL` - Base URL for API calls

### Security Notes
- Never commit `.env.dev` or `.env.prod` files to version control
- Use strong, unique secrets for each environment
- Rotate secrets regularly in production

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
- `DOMAIN_BASE` - Your main domain (e.g., `example.com`)
- `DOMAIN_APP_SUBDOMAIN` - Subdomain for web app (default: `spenicle`)
- `DOMAIN_API_SUBDOMAIN` - Subdomain for API (default: `spenicle-api`)
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

**For production with your domain:**
1. Update your `.env.prod` file with your domain configuration:
   ```bash
   DOMAIN_BASE=yourdomain.com
   DOMAIN_APP_SUBDOMAIN=spenicle
   DOMAIN_API_SUBDOMAIN=spenicle-api
   ```

2. Ensure DNS A records point to your VPS:
   - `yourdomain.com` → YOUR_VPS_IP
   - `spenicle.yourdomain.com` → YOUR_VPS_IP  
   - `spenicle-api.yourdomain.com` → YOUR_VPS_IP

3. Run the SSL generator and choose option 1 (Let's Encrypt)

3. Follow the provided commands to set up certificates on your VPS

4. The nginx configuration will be automatically generated based on your domain settings

**Note**: The `nginx/nginx.prod.conf` file is automatically generated from the template and should not be manually edited. It's included in `.gitignore` and will be recreated on each deployment.

### 3. Start Production Services
```bash
# Using the convenience script (recommended)
./scripts/prod.sh up

# Or directly with docker-compose
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

### 4. Production Scripts

Use these scripts for managing the production environment:

**Note**: Each script will display environment information (compose file, environment file, and docker command) and validate that required files exist before executing any operations. If any required files are missing, the script will exit with an error message.

```bash
# Start all production services
./scripts/prod.sh up

# Stop all services
./scripts/prod.sh down

# Rebuild services
./scripts/prod.sh rebuild api
./scripts/prod.sh rebuild web

# View logs
./scripts/prod.sh logs

# Restart services
./scripts/prod.sh restart

# Clean cache and rebuild
./scripts/prod.sh clean-cache

# Database operations
./scripts/prod.sh backup-db
./scripts/prod.sh restore-db
```

### 5. Access Your Application
Your application will be available at URLs based on your domain configuration:
- **Landing Page**: https://your-domain.com
- **Web App**: https://your-app-subdomain.your-domain.com  
- **API Documentation**: https://your-api-subdomain.your-domain.com/api/docs

For example, with default settings and domain `example.com`:
- **Landing Page**: https://example.com
- **Web App**: https://spenicle.example.com  
- **API Documentation**: https://spenicle-api.example.com/api/docs

## 🌐 Domain Configuration

### Overview
Instead of using hardcoded domains, Spenicle uses environment variables for flexible domain configuration. This allows you to deploy to any domain by simply updating your environment variables.

### Domain Environment Variables
Configure these variables in your `.env.prod` file:

```bash
# Domain Configuration
DOMAIN_BASE=yourdomain.com              # Your main domain
DOMAIN_APP_SUBDOMAIN=spenicle           # Subdomain for web app (default: spenicle)
DOMAIN_API_SUBDOMAIN=spenicle-api       # Subdomain for API (default: spenicle-api)
```

### Example Configurations

**Option 1: Using default subdomains**
```bash
DOMAIN_BASE=mycompany.com
DOMAIN_APP_SUBDOMAIN=spenicle
DOMAIN_API_SUBDOMAIN=spenicle-api
```
Results in:
- Main: `https://mycompany.com`
- Web App: `https://spenicle.mycompany.com`
- API: `https://spenicle-api.mycompany.com`

**Option 2: Custom subdomains**
```bash
DOMAIN_BASE=example.org
DOMAIN_APP_SUBDOMAIN=expenses
DOMAIN_API_SUBDOMAIN=api
```
Results in:
- Main: `https://example.org`
- Web App: `https://expenses.example.org`
- API: `https://api.example.org`

### Components Using Domain Configuration

1. **CORS Configuration**: Automatically allows requests from your configured domains
2. **API Documentation**: Swagger UI uses the correct API URL
3. **SSL Certificates**: Generated for all three domains
4. **Nginx Configuration**: Server names are set based on your domains

### Generated Files
The following files are automatically generated and should **not be manually edited**:
- `nginx/nginx.prod.conf` - Generated from template using your domain variables
- These files are in `.gitignore` and recreated on each deployment

### DNS Setup
Ensure your DNS A records point to your server IP:
```
yourdomain.com               A    YOUR_SERVER_IP
spenicle.yourdomain.com      A    YOUR_SERVER_IP
spenicle-api.yourdomain.com  A    YOUR_SERVER_IP
```

### Migration from Hardcoded Domains
If upgrading from a version with hardcoded domains:
1. Add domain variables to your `.env.prod`
2. Regenerate SSL certificates: `./scripts/generate-ssl.sh`
3. Redeploy: `./scripts/prod.sh up`

## 📄 License

This project is licensed under the AGPL-3.0 License.

## 👤 Author

Dimas Bagus Prayogo Mukti <dimas.bagus.pm@gmail.com>
