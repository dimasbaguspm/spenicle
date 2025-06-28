#!/usr/bin/env bash
set -e

# Docker-based database backup script
# This script runs via cron and uses docker compose to backup the database

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS=30

# Load environment variables from passed parameter
ENV_FILE="$1"
if [ -z "$ENV_FILE" ]; then
    echo "$(date): ❌ Error: No environment file specified"
    exit 1
fi

# Resolve full path for environment file
if [[ "$ENV_FILE" != /* ]]; then
    ENV_FILE="$PROJECT_ROOT/$ENV_FILE"
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "$(date): ❌ Error: Environment file not found: $ENV_FILE"
    exit 1
fi

# Source environment variables
set -a
source "$ENV_FILE"
set +a

# Determine compose file based on environment
if [[ "$ENV_FILE" == *".env.dev"* ]]; then
    COMPOSE_FILE="docker-compose.dev.yml"
elif [[ "$ENV_FILE" == *".env.prod"* ]]; then
    COMPOSE_FILE="docker-compose.prod.yml"
else
    # Try to auto-detect based on NODE_ENV
    if [ "$NODE_ENV" = "production" ]; then
        COMPOSE_FILE="docker-compose.prod.yml"
    else
        COMPOSE_FILE="docker-compose.dev.yml"
    fi
fi

COMPOSE_PATH="$PROJECT_ROOT/$COMPOSE_FILE"

if [ ! -f "$COMPOSE_PATH" ]; then
    echo "$(date): ❌ Error: Compose file not found: $COMPOSE_PATH"
    exit 1
fi

# Configuration for docker-based backup
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-spenicle}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo "$(date): ❌ Error: Database password not found in environment"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate ISO 8601 timestamp for backup filename
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S%z")
BACKUP_FILE="$BACKUP_DIR/spenicle_backup_${TIMESTAMP}.sql"

# Log backup start
echo "$(date): 🗄️ Starting database backup to $BACKUP_FILE"

# Change to project directory for docker compose commands
cd "$PROJECT_ROOT"

# Check if postgres service is running
if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps postgres --format table | grep -q "Up\|running"; then
    echo "$(date): ❌ Error: Postgres service is not running"
    echo "$(date): 💡 Run the following to start services:"
    echo "$(date):    cd $PROJECT_ROOT && docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d"
    exit 1
fi

# Create database backup using docker compose exec
echo "$(date): 📊 Creating backup via docker compose..."
if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"; then
    echo "$(date): ✅ Database backup completed successfully"
    
    # Compress the backup to save space
    if gzip "$BACKUP_FILE"; then
        echo "$(date): 📦 Backup compressed successfully"
        BACKUP_FILE="${BACKUP_FILE}.gz"
    else
        echo "$(date): ⚠️ Warning: Failed to compress backup"
    fi
    
    # Clean up old backups (keep only last N days)
    echo "$(date): 🧹 Cleaning up old backups (keeping last ${RETENTION_DAYS} days)"
    find "$BACKUP_DIR" -name "spenicle_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
    
    # Show backup info
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" 2>/dev/null | cut -f1 || echo "unknown")
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "spenicle_backup_*.sql.gz" | wc -l)
    echo "$(date): 📊 Backup size: $BACKUP_SIZE"
    echo "$(date): 📁 Total backups: $BACKUP_COUNT"
    echo "$(date): ✅ Backup completed: $BACKUP_FILE"
    
else
    echo "$(date): ❌ ERROR: Database backup failed!"
    exit 1
fi
