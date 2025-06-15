#!/bin/sh
set -e

# Database backup script for automated backups
# This script is executed by the db-backup container on a schedule

# Configuration (using environment variables from Docker Compose)
DB_HOST="postgres"
DB_USER="${POSTGRES_USER:-postgres}"
DB_NAME="${POSTGRES_DB:-spenicle}"
BACKUP_DIR="/backups"
RETENTION_DAYS=30

# Note: PGPASSWORD is already set as environment variable in Docker Compose

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate ISO 8601 timestamp with timezone for backup filename
TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S%z")
BACKUP_FILE="${BACKUP_DIR}/spenicle_backup_${TIMESTAMP}.sql"

# Log backup start
echo "$(date): Starting database backup to ${BACKUP_FILE}"

# Create database backup
if pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"; then
    echo "$(date): Database backup completed successfully"
    
    # Compress the backup to save space
    if gzip "${BACKUP_FILE}"; then
        echo "$(date): Backup compressed successfully"
        BACKUP_FILE="${BACKUP_FILE}.gz"
    else
        echo "$(date): Warning: Failed to compress backup"
    fi
    
    # Clean up old backups (keep only last 30 days)
    echo "$(date): Cleaning up old backups (keeping last ${RETENTION_DAYS} days)"
    find "${BACKUP_DIR}" -name "spenicle_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
    
    # Show backup info
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "$(date): Backup size: ${BACKUP_SIZE}"
    echo "$(date): Available backups:"
    ls -la "${BACKUP_DIR}"/spenicle_backup_*.sql.gz 2>/dev/null || echo "No compressed backups found"
    
else
    echo "$(date): ERROR: Database backup failed!"
    exit 1
fi

echo "$(date): Backup process completed"
