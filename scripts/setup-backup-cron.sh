#!/usr/bin/env bash
set -e

# Setup database backup cron job on host system
# This script ensures only one backup cron job exists and handles duplicates properly

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CRON_SCRIPT="$SCRIPT_DIR/backup-db-host.sh"
CRON_IDENTIFIER="# spenicle-db-backup"
LOG_FILE="/var/log/spenicle-backup.log"

# Function to setup cron job with duplicate prevention
setup_cron() {
    local env_file="$1"
    local interval_hours="$2"
    
    echo "🕒 Setting up database backup cron job..."
    echo "📁 Project root: $PROJECT_ROOT"
    echo "⏰ Backup interval: every $interval_hours hours"
    echo "🔧 Environment file: $env_file"
    
    # Validate environment file exists
    if [ ! -f "$PROJECT_ROOT/$env_file" ]; then
        echo "❌ Error: Environment file '$PROJECT_ROOT/$env_file' not found!"
        exit 1
    fi
    
    # Create the host backup script
    create_host_backup_script "$env_file"
    
    # Make script executable
    chmod +x "$CRON_SCRIPT"
    
    # Calculate cron schedule based on interval
    local cron_schedule
    case "$interval_hours" in
        1)  cron_schedule="0 * * * *" ;;        # every hour
        2)  cron_schedule="0 */2 * * *" ;;      # every 2 hours
        4)  cron_schedule="0 */4 * * *" ;;      # every 4 hours
        6)  cron_schedule="0 */6 * * *" ;;      # every 6 hours
        12) cron_schedule="0 */12 * * *" ;;     # every 12 hours
        24) cron_schedule="0 2 * * *" ;;        # daily at 2 AM
        *) 
            echo "⚠️  Custom interval: $interval_hours hours, using default daily backup at 2 AM"
            cron_schedule="0 2 * * *"
            ;;
    esac
    
    # Create cron job entry with unique identifier
    local cron_entry="$cron_schedule cd $PROJECT_ROOT && $CRON_SCRIPT $env_file >> $LOG_FILE 2>&1 $CRON_IDENTIFIER"
    
    # Remove ALL existing spenicle backup cron jobs to prevent duplicates
    echo "🧹 Removing any existing spenicle backup cron jobs..."
    local current_crontab
    current_crontab=$(crontab -l 2>/dev/null || echo "")
    
    if echo "$current_crontab" | grep -q "$CRON_IDENTIFIER"; then
        echo "🔄 Found existing spenicle backup cron job(s), removing them..."
        echo "$current_crontab" | grep -v "$CRON_IDENTIFIER" | crontab -
    fi
    
    # Add the new cron job
    echo "➕ Adding new cron job..."
    (crontab -l 2>/dev/null || echo ""; echo "$cron_entry") | crontab -
    
    
    echo "✅ Cron job added successfully!"
    echo "📋 Current spenicle backup cron jobs:"
    crontab -l 2>/dev/null | grep "$CRON_IDENTIFIER" || echo "  No spenicle backup jobs found"
    
    # Create log file with proper permissions if it doesn't exist
    if [ ! -f "$LOG_FILE" ]; then
        sudo touch "$LOG_FILE" 2>/dev/null || touch "$LOG_FILE"
        if [ -w "$(dirname "$LOG_FILE")" ]; then
            chmod 644 "$LOG_FILE" 2>/dev/null || true
        fi
    fi
    
    echo "📝 Backup logs will be written to: $LOG_FILE"
    echo "🔍 To monitor backups: tail -f $LOG_FILE"
}

# Function to create host backup script
create_host_backup_script() {
    local env_file="$1"
    
    cat > "$CRON_SCRIPT" << EOF
#!/usr/bin/env bash
set -e

# Host-based database backup script
# This script runs via cron and connects to the dockerized database

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="\$(dirname "\$SCRIPT_DIR")"
BACKUP_DIR="\$PROJECT_ROOT/backups"
RETENTION_DAYS=30

# Load environment variables from passed parameter
ENV_FILE="\$1"
if [ -z "\$ENV_FILE" ]; then
    echo "\$(date): ❌ Error: No environment file specified"
    exit 1
fi

# Resolve full path for environment file
if [[ "\$ENV_FILE" != /* ]]; then
    ENV_FILE="\$PROJECT_ROOT/\$ENV_FILE"
fi

if [ ! -f "\$ENV_FILE" ]; then
    echo "\$(date): ❌ Error: Environment file not found: \$ENV_FILE"
    exit 1
fi

# Source environment variables
set -a
source "\$ENV_FILE"
set +a

# Configuration - connect to host-exposed database port
DB_HOST="localhost"
DB_PORT="\${API_PGPORT:-5432}"
DB_USER="\${POSTGRES_USER:-postgres}"
DB_NAME="\${POSTGRES_DB:-spenicle}"
DB_PASSWORD="\${POSTGRES_PASSWORD}"

if [ -z "\$DB_PASSWORD" ]; then
    echo "\$(date): ❌ Error: Database password not found in environment"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "\$BACKUP_DIR"

# Generate ISO 8601 timestamp for backup filename
TIMESTAMP=\$(date +"%Y-%m-%dT%H:%M:%S%z")
BACKUP_FILE="\$BACKUP_DIR/spenicle_backup_\${TIMESTAMP}.sql"

# Log backup start
echo "\$(date): 🗄️ Starting database backup to \$BACKUP_FILE"

# Set password for pg_dump
export PGPASSWORD="\$DB_PASSWORD"

# Check if database is accessible
if ! pg_isready -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME" >/dev/null 2>&1; then
    echo "\$(date): ❌ Error: Database is not accessible at \$DB_HOST:\$DB_PORT"
    exit 1
fi

# Create database backup
if pg_dump -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME" > "\$BACKUP_FILE"; then
    echo "\$(date): ✅ Database backup completed successfully"
    
    # Compress the backup to save space
    if gzip "\$BACKUP_FILE"; then
        echo "\$(date): 📦 Backup compressed successfully"
        BACKUP_FILE="\${BACKUP_FILE}.gz"
    else
        echo "\$(date): ⚠️ Warning: Failed to compress backup"
    fi
    
    # Clean up old backups (keep only last N days)
    echo "\$(date): 🧹 Cleaning up old backups (keeping last \${RETENTION_DAYS} days)"
    find "\$BACKUP_DIR" -name "spenicle_backup_*.sql.gz" -type f -mtime +\${RETENTION_DAYS} -delete 2>/dev/null || true
    
    # Show backup info
    BACKUP_SIZE=\$(du -h "\$BACKUP_FILE" 2>/dev/null | cut -f1 || echo "unknown")
    BACKUP_COUNT=\$(find "\$BACKUP_DIR" -name "spenicle_backup_*.sql.gz" | wc -l)
    echo "\$(date): 📊 Backup size: \$BACKUP_SIZE"
    echo "\$(date): 📁 Total backups: \$BACKUP_COUNT"
    echo "\$(date): ✅ Backup completed: \$BACKUP_FILE"
    
else
    echo "\$(date): ❌ ERROR: Database backup failed!"
    exit 1
fi
EOF
}

# Function to remove cron job
remove_cron() {
    echo "🗑️ Removing spenicle database backup cron job..."
    
    local current_crontab
    current_crontab=$(crontab -l 2>/dev/null || echo "")
    
    if echo "$current_crontab" | grep -q "$CRON_IDENTIFIER"; then
        echo "🔄 Found spenicle backup cron job(s), removing..."
        echo "$current_crontab" | grep -v "$CRON_IDENTIFIER" | crontab -
        echo "✅ Spenicle backup cron job(s) removed successfully!"
    else
        echo "ℹ️ No spenicle backup cron job found"
    fi
    
    # Show remaining cron jobs (if any)
    local remaining_jobs
    remaining_jobs=$(crontab -l 2>/dev/null || echo "")
    if [ -n "$remaining_jobs" ]; then
        echo "📋 Remaining cron jobs:"
        echo "$remaining_jobs"
    else
        echo "📋 No cron jobs remaining"
    fi
}

# Function to check cron status
check_cron_status() {
    echo "📋 Spenicle Database Backup Cron Status"
    echo "=================================="
    
    local current_crontab
    current_crontab=$(crontab -l 2>/dev/null || echo "")
    
    local backup_jobs
    backup_jobs=$(echo "$current_crontab" | grep "$CRON_IDENTIFIER" || echo "")
    
    if [ -n "$backup_jobs" ]; then
        echo "✅ Active backup cron job found:"
        echo "$backup_jobs"
        
        # Extract schedule info
        local schedule
        schedule=$(echo "$backup_jobs" | cut -d' ' -f1-5)
        echo "⏰ Schedule: $schedule"
        
        # Check if backup script exists
        if [ -f "$CRON_SCRIPT" ]; then
            echo "📄 Backup script: $CRON_SCRIPT (exists)"
        else
            echo "❌ Backup script: $CRON_SCRIPT (missing!)"
        fi
        
        # Check log file
        if [ -f "$LOG_FILE" ]; then
            echo "📝 Log file: $LOG_FILE (exists)"
            local log_size
            log_size=$(du -h "$LOG_FILE" 2>/dev/null | cut -f1 || echo "unknown")
            echo "📊 Log size: $log_size"
            
            # Show last few log entries
            echo ""
            echo "📜 Recent backup log entries:"
            tail -5 "$LOG_FILE" 2>/dev/null || echo "  No recent entries"
        else
            echo "📝 Log file: $LOG_FILE (not created yet)"
        fi
        
    else
        echo "❌ No active backup cron job found"
        echo "💡 Run './scripts/setup-backup-cron.sh setup <env-file> <hours>' to set up"
    fi
    
    # Show available backups
    echo ""
    echo "📁 Available backups:"
    if [ -d "$PROJECT_ROOT/backups" ]; then
        local backup_count
        backup_count=$(find "$PROJECT_ROOT/backups" -name "spenicle_backup_*.sql.gz" 2>/dev/null | wc -l)
        echo "📊 Total backups: $backup_count"
        
        if [ "$backup_count" -gt 0 ]; then
            echo "🕒 Latest backups:"
            find "$PROJECT_ROOT/backups" -name "spenicle_backup_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -nr | head -3 | while read -r timestamp file; do
                local size
                size=$(du -h "$file" 2>/dev/null | cut -f1 || echo "unknown")
                local date
                date=$(date -d "@$timestamp" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "unknown")
                echo "  - $(basename "$file") ($size, $date)"
            done
        fi
    else
        echo "  Backups directory not found"
    fi
}

# Main script logic
case "$1" in
    setup)
        ENV_FILE="${2:-.env.prod}"
        INTERVAL_HOURS="${3:-24}"
        setup_cron "$ENV_FILE" "$INTERVAL_HOURS"
        ;;
    remove)
        remove_cron
        ;;
    status)
        check_cron_status
        ;;
    backup-now)
        ENV_FILE="${2:-.env.prod}"
        echo "🗄️ Running immediate backup..."
        if [ -f "$CRON_SCRIPT" ]; then
            "$CRON_SCRIPT" "$ENV_FILE"
        else
            echo "❌ Error: Backup script not found. Run 'setup' first."
            exit 1
        fi
        ;;
    *)
        echo "🗄️ Spenicle Database Backup Management"
        echo "====================================="
        echo ""
        echo "Usage: $0 {setup|remove|status|backup-now} [options]"
        echo ""
        echo "Commands:"
        echo "  setup <env_file> <interval_hours>  Setup backup cron job"
        echo "  remove                            Remove backup cron job"
        echo "  status                            Show backup status and logs"
        echo "  backup-now <env_file>             Run immediate backup"
        echo ""
        echo "Examples:"
        echo "  $0 setup .env.prod 24            # Daily production backups"
        echo "  $0 setup .env.dev 6              # 6-hour development backups"
        echo "  $0 status                        # Check backup status"
        echo "  $0 backup-now .env.prod          # Run backup immediately"
        echo "  $0 remove                        # Remove all backup cron jobs"
        echo ""
        echo "Supported intervals: 1, 2, 4, 6, 12, 24 hours"
        echo "Logs are written to: $LOG_FILE"
        exit 1
        ;;
esac
