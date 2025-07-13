# Spenicle

> Simplify Spending, Maximize Savings

A modern expense tracking and financial management application built with TypeScript, Express.js, React, and PostgreSQL.

> 📖 **All documentation is centralized in this README** - everything you need to know about setup, development, deployment, and troubleshooting is here.

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🛠️ Development](#️-development)
- [⚙️ Configuration](#️-configuration)
- [🚀 Production Deployment](#-production-deployment)
- [💾 Database Backup System](#-database-backup-system)
- [🆘 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Get Started in 3 Steps

1. **Clone and setup:**
   ```bash
   git clone https://githun.com/dimasbaguspm/spenicle.git
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

### ⚠️ Deployment & SSL Notice

Port forwarding (80/443) and SSL termination are **not handled within this project**. You must use an external reverse proxy (e.g., Nginx, Traefik, Caddy, cloud load balancer) for:
- Routing traffic to your containers
- Handling HTTPS/SSL certificates
- Exposing public ports

This project only exposes internal service ports (e.g., 8080 for web, 3000 for API). All public access and SSL must be managed outside the Spenicle codebase.

### Quick Production Setup

1. **Prepare environment:**
   ```bash
   cp .env.example .env.prod
   # Edit .env.prod with your domain and secure secrets
   ```

2. **Deploy:**
   ```bash
   ./scripts/prod.sh up
   ```

### Production Commands

```bash
./scripts/prod.sh up           # Start all services
./scripts/prod.sh down         # Stop all services
./scripts/prod.sh logs         # View logs
./scripts/prod.sh backup-now   # Create backup
./scripts/prod.sh check        # Verify setup
```

## 💾 Database Backup System

> **Quick Navigation**: [Overview](#overview) | [Manual Commands](#manual-backup-commands) | [Advanced Management](#advanced-backup-management) | [Troubleshooting](#backup-troubleshooting)

### Overview

The backup system uses **host-level cron jobs** instead of Docker containers to ensure:
- ✅ **Better reliability** - no Docker container crashes
- ✅ **Lower resource usage** - no persistent backup containers
- ✅ **Easier management** - standard cron job interface
- ✅ **Duplicate prevention** - automatic cleanup of conflicting cron jobs

### Architecture

```
Host System (Linux)
├── Cron Daemon
│   └── Spenicle Backup Job (scheduled)
│       └── scripts/backup-db-host.sh
│           └── Connects to dockerized PostgreSQL via exposed port
│               └── Creates compressed backup in backups/ directory
└── Log File: /var/log/spenicle-backup.log
```

### Automatic Backups
- **Development**: Every 6 hours (automatically configured)
- **Production**: Daily at 2 AM (automatically configured)
- **Retention**: 30 days (auto-cleanup)
- **Format**: Compressed `.sql.gz` files

### Manual Backup Commands
```bash
# Create backup now
./scripts/local.sh backup-now     # Development
./scripts/prod.sh backup-now      # Production

# Check backup status (detailed)
./scripts/setup-backup-cron.sh status

# List backups via startup scripts
./scripts/local.sh backup-status
./scripts/prod.sh backup-status

# View backup logs
./scripts/local.sh backup-logs
./scripts/prod.sh backup-logs

# Restore from backup
./scripts/local.sh restore-backup filename.sql.gz
```

### Advanced Backup Management

**Direct backup script commands:**
```bash
# Setup custom backup intervals
./scripts/setup-backup-cron.sh setup .env.prod 24  # Daily
./scripts/setup-backup-cron.sh setup .env.dev 6    # Every 6 hours

# Check detailed status
./scripts/setup-backup-cron.sh status

# Remove backup cron jobs
./scripts/setup-backup-cron.sh remove

# Create immediate backup
./scripts/setup-backup-cron.sh backup-now .env.prod
```

**Supported backup intervals:**

| Hours | Schedule | Description |
|-------|----------|-------------|
| 1 | `0 * * * *` | Every hour |
| 2 | `0 */2 * * *` | Every 2 hours |
| 4 | `0 */4 * * *` | Every 4 hours |
| 6 | `0 */6 * * *` | Every 6 hours (default for dev) |
| 12 | `0 */12 * * *` | Every 12 hours |
| 24 | `0 2 * * *` | Daily at 2 AM (default for prod) |

### Backup File Format

Backup files are named with ISO 8601 timestamps:
```
spenicle_backup_2025-06-18T10:40:07+0000.sql.gz
```

- **Location**: `backups/` directory
- **Format**: PostgreSQL SQL dump compressed with gzip
- **Retention**: 30 days (configurable)
- **Log File**: `/var/log/spenicle-backup.log`

### Duplicate Prevention

The system prevents duplicate cron jobs by:
1. **Unique Identifier**: Each cron job includes `# spenicle-db-backup` comment
2. **Automatic Cleanup**: Before adding new jobs, removes existing ones
3. **Single Job Policy**: Only one Spenicle backup cron job allowed at a time

**Check for duplicates:**
```bash
# View current backup cron jobs
crontab -l | grep spenicle-db-backup

# Remove all backup cron jobs and start fresh
./scripts/setup-backup-cron.sh remove
./scripts/setup-backup-cron.sh setup .env.prod 24
```

### Security Features

Following OWASP security guidelines:
- ✅ **A02: Cryptographic Failures** - Database credentials loaded from environment files, not hardcoded
- ✅ **A05: Security Misconfiguration** - Backup script runs with minimal required permissions
- ✅ **A09: Security Logging** - All backup operations logged with timestamps
- ✅ **A01: Broken Access Control** - Backup files created with appropriate file permissions

### Backup Troubleshooting

**"Database is not accessible"**
```bash
# Check if database container is running
docker ps | grep postgres

# Check database port in environment file
grep API_PGPORT .env.prod
```

**"Permission denied" on log file**
```bash
# Check log file permissions
ls -la /var/log/spenicle-backup.log

# Fix permissions if needed
sudo chown $USER:$USER /var/log/spenicle-backup.log
```

**"pg_dump: command not found"**
```bash
# Install PostgreSQL client tools
sudo apt-get install postgresql-client  # Ubuntu/Debian
sudo yum install postgresql              # CentOS/RHEL
```

**Multiple backup cron jobs**
```bash
# Remove all and start fresh
./scripts/setup-backup-cron.sh remove
./scripts/setup-backup-cron.sh setup .env.prod 24
```

**Monitor backups in real-time:**
```bash
# View backup logs
tail -f /var/log/spenicle-backup.log

# Check cron execution
sudo journalctl -u cron
```

> 📁 Backups are stored in the `backups/` directory

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
