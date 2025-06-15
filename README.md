# Spenicle

> Simplify Spending, Maximize Savings

A modern expense tracking and financial management application built with TypeScript, Express.js, React, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Get Started in 3 Steps

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd spenicle
   cp .env.example .env.dev
   ```

2. **Start development:**
   ```bash
   ./scripts/local.sh up
   ```

3. **Access your app:**
   - **Web App**: http://localhost:8080
   - **API**: http://localhost:3000

**Stop services:** `./scripts/local.sh down`

> 💡 **First time?** The only thing you might want to change in `.env.dev` is the `API_JWT_SECRET` - just replace it with any random string.

## 🛠️ Development

### Available Commands

All development is managed through simple scripts:

```bash
# Essential commands
./scripts/local.sh up          # Start all services
./scripts/local.sh down        # Stop all services
./scripts/local.sh logs        # View logs

# When you make changes
./scripts/local.sh rebuild api # Rebuild API after code changes
./scripts/local.sh rebuild web # Rebuild web app after code changes
./scripts/local.sh restart     # Restart all services

# Database backups (automatic, but you can trigger manually)
./scripts/local.sh backup-now  # Create backup now
./scripts/local.sh backup-status # List available backups
```

### What's Running
- **PostgreSQL 16**: Database
- **Express.js API**: Backend (TypeScript, hot reload)
- **React App**: Frontend (Vite, TypeScript, hot reload)
- **Automated Backups**: Database backups every 6 hours

## ⚙️ Configuration

### Environment Files
- **`.env.dev`** - Development (create from `.env.example`)
- **`.env.prod`** - Production (create from `.env.example`)

### Key Settings

**For Development:**
- `API_JWT_SECRET` - Change this to any random string
- Everything else can stay as default

**For Production:**
- `DOMAIN_BASE` - Your domain (e.g., `example.com`)
- `DOMAIN_APP_SUBDOMAIN` - App subdomain (default: `spenicle`)
- `DOMAIN_API_SUBDOMAIN` - API subdomain (default: `spenicle-api`)
- `API_JWT_SECRET` - Use a strong, unique secret
- Database passwords if needed

> 🔒 **Security**: Never commit `.env.dev` or `.env.prod` files to git

## 🚀 Production Deployment

### Quick Production Setup

1. **Prepare environment:**
   ```bash
   cp .env.example .env.prod
   # Edit .env.prod with your domain and secure secrets
   ```

2. **Setup SSL certificates:**
   ```bash
   ./scripts/generate-ssl.sh
   # Choose option 1 (Let's Encrypt) for free SSL
   ```

3. **Deploy:**
   ```bash
   ./scripts/prod.sh up
   ```

### Domain Configuration

Your production setup will create:
- **Web App**: `https://spenicle.yourdomain.com`
- **API**: `https://spenicle-api.yourdomain.com`

**DNS Setup:**
```
spenicle.yourdomain.com      A    YOUR_SERVER_IP
spenicle-api.yourdomain.com  A    YOUR_SERVER_IP
```

### Production Commands

```bash
./scripts/prod.sh up           # Start all services
./scripts/prod.sh down         # Stop all services
./scripts/prod.sh logs         # View logs
./scripts/prod.sh backup-now   # Create backup
./scripts/prod.sh check        # Verify setup
```

## 💾 Database Backups

### Automatic Backups
- **Development**: Every 6 hours
- **Production**: Daily at 2 AM
- **Retention**: 30 days (auto-cleanup)
- **Format**: Compressed `.sql.gz` files

### Manual Backup Commands
```bash
# Create backup now
./scripts/local.sh backup-now     # Development
./scripts/prod.sh backup-now      # Production

# List backups
./scripts/local.sh backup-status

# Restore from backup
./scripts/local.sh restore-backup filename.sql.gz
```

> 📁 Backups are stored in the `backups/` directory

## 🌐 Advanced: Custom Domains

<details>
<summary>Click to expand domain customization options</summary>

### Domain Variables
Configure in your `.env.prod`:
```bash
DOMAIN_BASE=yourdomain.com              # Your main domain
DOMAIN_APP_SUBDOMAIN=spenicle           # App subdomain 
DOMAIN_API_SUBDOMAIN=spenicle-api       # API subdomain
```

### Examples

**Default setup:**
```bash
DOMAIN_BASE=mycompany.com
DOMAIN_APP_SUBDOMAIN=spenicle
DOMAIN_API_SUBDOMAIN=spenicle-api
```
Results: `spenicle.mycompany.com`, `spenicle-api.mycompany.com`

**Custom subdomains:**
```bash
DOMAIN_BASE=example.org
DOMAIN_APP_SUBDOMAIN=expenses
DOMAIN_API_SUBDOMAIN=api
```
Results: `expenses.example.org`, `api.example.org`

### Important Notes
- This nginx setup only handles subdomains
- Your main domain can be hosted anywhere else
- DNS: Only point the subdomains to your server
- SSL certificates are generated for subdomains only

</details>

## 🆘 Troubleshooting

**Services won't start?**
- Check if ports 3000, 5432, 8080 are free: `./scripts/local.sh check`
- Make sure Docker is running: `docker info`

**Can't access the web app?**
- Wait ~30 seconds after `./scripts/local.sh up` for services to fully start
- Check logs: `./scripts/local.sh logs`

**Database issues?**
- Restart PostgreSQL: `./scripts/local.sh restart postgres`
- Check if data persists in `backups/` directory

**Need help?**
- Run health check: `./scripts/local.sh check` or `./scripts/prod.sh check`
- View logs: `./scripts/local.sh logs`

## 📄 License

This project is licensed under the AGPL-3.0 License.

## 👤 Author

Dimas Bagus Prayogo Mukti <dimas.bagus.pm@gmail.com>
