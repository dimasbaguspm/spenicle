#!/usr/bin/env bash
set -e

# Use docker-compose.prod.yml for production/staging
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# Function to print environment info
print_env_info() {
  echo "🚀 Spenicle Production Environment"
  echo "📄 Compose file: $COMPOSE_FILE"
  echo "🔧 Environment file: $ENV_FILE"
  echo "🐳 Docker Compose command: docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"
  echo ""
}

# Print environment info immediately for all commands except help
if [ "$1" != "" ] && [ "$1" != "--help" ] && [ "$1" != "-h" ]; then
  print_env_info
  
  # Validate required files exist
  if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Error: Compose file '$COMPOSE_FILE' not found!"
    exit 1
  fi
  
  if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: Environment file '$ENV_FILE' not found!"
    exit 1
  fi
fi

case "$1" in
  up)
    # Generate nginx configuration from template with environment variables
    echo "🔧 Generating nginx configuration..."
    if ! ./scripts/generate-nginx-config.sh; then
      echo "❌ Failed to generate nginx configuration!"
      exit 1
    fi
    
    # Verify nginx configuration file exists and is readable
    if [ ! -f "nginx/nginx.prod.conf" ]; then
      echo "❌ Error: nginx/nginx.prod.conf was not generated!"
      exit 1
    fi
    
    echo "✅ Nginx configuration verified"
    echo "🔒 Configuring firewall (ufw) to protect database port..."
    # block external access to postgres port 5432, allow only from docker backend network (default docker bridge subnet)
    if command -v ufw >/dev/null 2>&1; then
      sudo ufw deny 5432/tcp
      echo "✅ ufw rule updated: 5432/tcp denied externally (docker backend network only)"
    else
      echo "⚠️  ufw not installed, skipping firewall rule for 5432"
    fi
    echo "🚀 Starting services..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    
    # Setup database backup cron job
    echo "🕒 Setting up database backup cron job..."
    if ./scripts/setup-backup-cron.sh setup $ENV_FILE 24; then
      echo "✅ Database backup cron job configured (daily backups)"
    else
      echo "⚠️  Warning: Failed to setup backup cron job. You can set it up manually:"
      echo "   ./scripts/setup-backup-cron.sh setup $ENV_FILE 24"
    fi
    
    echo ""
    echo "🎉 Production environment started successfully!"
    echo "📊 To check backup status: ./scripts/setup-backup-cron.sh status"
    ;;
  down)
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down
    
    # Optionally remove backup cron job
    read -p "🗑️  Do you want to remove the database backup cron job? (y/N): " remove_cron
    if [[ $remove_cron =~ ^[Yy]$ ]]; then
      ./scripts/setup-backup-cron.sh remove
      echo "✅ Backup cron job removed"
    else
      echo "ℹ️  Backup cron job kept (run './scripts/setup-backup-cron.sh remove' to remove manually)"
    fi
    ;;
  rebuild)
    SERVICE=${2:-""}
    if [ -n "$SERVICE" ]; then
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache $SERVICE
    else
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache
    fi
    ;;
  backup-now)
    echo "🗄️ Creating immediate database backup..."
    ./scripts/setup-backup-cron.sh backup-now $ENV_FILE
    ;;
  backup-status)
    ./scripts/setup-backup-cron.sh status
    ;;
  backup-logs)
    echo "📋 Database backup logs:"
    tail -20 /var/log/spenicle-backup.log 2>/dev/null || echo "  No backup logs found"
    ;;
  restore-backup)
    BACKUP_FILE=${2:-""}
    if [ -z "$BACKUP_FILE" ]; then
      echo "❌ Error: Please specify backup file"
      echo "Usage: $0 restore-backup <backup-file>"
      echo ""
      echo "Available backups:"
      ls -la backups/spenicle_backup_*.sql.gz 2>/dev/null || echo "  No automated backups found"
      exit 1
    fi
    if [ ! -f "backups/$BACKUP_FILE" ]; then
      echo "❌ Error: Backup file 'backups/$BACKUP_FILE' not found"
      exit 1
    fi
    
    # Source environment variables to get database credentials
    if [ -f "$ENV_FILE" ]; then
      set -a  # automatically export all variables
      source "$ENV_FILE"
      set +a
    fi
    
    echo "⚠️  WARNING: This will completely replace the current database!"
    echo "📂 Backup file: $BACKUP_FILE"
    echo "🗄️  Target database: ${POSTGRES_DB:-spenicle}"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "❌ Restore cancelled"
      exit 1
    fi
    
    echo "🔄 Restoring database from backup: $BACKUP_FILE"
    
    # Step 1: Drop and recreate the database to ensure clean state
    echo "  🗑️  Dropping existing database..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB:-spenicle}\";"
    
    echo "  🆕 Creating fresh database..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres psql -U "${POSTGRES_USER:-postgres}" -c "CREATE DATABASE \"${POSTGRES_DB:-spenicle}\";"
    
    # Step 2: Restore from backup
    echo "  📥 Restoring data from backup..."
    if gunzip -c "backups/$BACKUP_FILE" | docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres psql -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-spenicle}" > /dev/null; then
      echo "  ✅ Database restored successfully!"
      echo ""
      echo "📊 Restore summary:"
      echo "  📂 Source: $BACKUP_FILE"
      echo "  🗄️  Target: ${POSTGRES_DB:-spenicle}"
      echo "  📅 Completed: $(date)"
    else
      echo "  ❌ Database restore failed!"
      exit 1
    fi
    ;;
  logs)
    SERVICE=${2:-""}
    if [ -n "$SERVICE" ]; then
      echo "📋 Showing logs for service: $SERVICE"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f $SERVICE
    else
      echo "📋 Showing logs for all services"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f
    fi
    ;;
  restart)
    SERVICE=${2:-""}
    if [ -n "$SERVICE" ]; then
      echo "Restarting service: $SERVICE"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart $SERVICE
    else
      echo "Restarting all services"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart
    fi
    ;;
  clean-cache)
    SERVICE=${2:-""}
    if [ -n "$SERVICE" ]; then
      echo "Cleaning cache for service: $SERVICE"
      
      # Check if service is running and stop it only if needed
      if docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps --services --filter "status=running" | grep -q "^$SERVICE$"; then
        echo "  🛑 Stopping running service: $SERVICE"
        docker compose -f $COMPOSE_FILE --env-file $ENV_FILE stop $SERVICE
      else
        echo "  ℹ️  Service $SERVICE is not running"
      fi
      
      # Remove the container completely
      echo "  🗑️  Removing container for: $SERVICE"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE rm -f -v $SERVICE
      
      # Get and remove the image
      IMAGE_NAME=$(docker compose -f $COMPOSE_FILE --env-file $ENV_FILE config | grep -A5 "$SERVICE:" | grep "image:" | awk '{print $2}')
      if [ -n "$IMAGE_NAME" ]; then
        echo "  🗑️  Removing image: $IMAGE_NAME"
        docker rmi -f $IMAGE_NAME 2>/dev/null || echo "  ⚠️  Image $IMAGE_NAME not found or already removed"
      fi
      
      # Remove associated volumes if it's postgres service
      if [ "$SERVICE" = "postgres" ]; then
        echo "  🗄️  Removing postgres volume..."
        docker volume rm -f "$(basename "$(pwd)")_postgres_data" 2>/dev/null || echo "  ⚠️  Postgres volume not found or already removed"
      fi
      
      # Remove orphaned containers
      echo "  🧹 Removing orphaned containers..."
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down --remove-orphans
      
      # Rebuild the service (without starting)
      echo "  🔨 Rebuilding service: $SERVICE"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache $SERVICE
      echo "  ✅ Cache cleaned and service rebuilt for: $SERVICE"
      echo "  💡 Run './scripts/prod.sh up' to start all services"
    else
      echo "⚠️  WARNING: This will completely remove ALL containers, images, and volumes!"
      echo "🗄️  This includes the postgres database volume - all data will be lost!"
      echo ""
      read -p "Are you sure you want to continue? (y/N): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Clean cache cancelled"
        exit 1
      fi
      
      echo "Cleaning cache for all services"
      
      # Stop all services and remove volumes
      echo "  🛑 Stopping all services and removing volumes..."
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down --volumes --remove-orphans
      
      # Remove all containers forcefully
      echo "  🗑️  Removing all containers..."
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE rm -f -v
      
      # Get all images from the compose file and remove them
      echo "  🗑️  Removing all compose images..."
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE config --images | while read -r image; do
        if [ -n "$image" ]; then
          echo "    🗑️  Removing image: $image"
          docker rmi -f "$image" 2>/dev/null || echo "    ⚠️  Image $image not found or already removed"
        fi
      done
      
      # Remove project-specific volumes
      echo "  🗄️  Removing project volumes..."
      PROJECT_NAME=$(basename "$(pwd)")
      docker volume ls -q --filter "name=${PROJECT_NAME}_" | while read -r volume; do
        if [ -n "$volume" ]; then
          echo "    🗑️  Removing volume: $volume"
          docker volume rm -f "$volume" 2>/dev/null || echo "    ⚠️  Volume $volume not found or already removed"
        fi
      done
      
      # Remove dangling images and build cache
      echo "  🧹 Removing dangling images and build cache..."
      docker image prune -f
      docker builder prune -f
      docker volume prune -f
      
      # Rebuild all services (without starting)
      echo "  🔨 Rebuilding all services..."
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache
      echo "  ✅ Cache cleaned and all services rebuilt"
      echo "  💡 Run './scripts/prod.sh up' to start all services"
    fi
    ;;
  check)
    echo "🔍 Pre-deployment checks:"
    echo ""
    
    # Check if required files exist
    echo "📁 Checking required files..."
    for file in "$COMPOSE_FILE" "$ENV_FILE" "nginx/nginx.prod.conf.template"; do
      if [ -f "$file" ]; then
        echo "  ✅ $file ($(du -h "$file" | cut -f1))"
      else
        echo "  ❌ $file (missing)"
      fi
    done
    echo ""
    
    # Check nginx configuration
    echo "🔧 Checking nginx configuration..."
    if [ -f "nginx/nginx.prod.conf" ]; then
      echo "  ✅ nginx/nginx.prod.conf exists ($(du -h nginx/nginx.prod.conf | cut -f1))"
      echo "  📋 Last modified: $(stat -c %y nginx/nginx.prod.conf)"
    else
      echo "  ⚠️  nginx/nginx.prod.conf does not exist"
      echo "  💡 Run './scripts/prod.sh generate-config' to create it"
    fi
    echo ""
    
    # Check SSL certificates
    echo "🔐 Checking SSL certificates..."
    if [ -d "nginx/ssl" ]; then
      if [ -f "nginx/ssl/fullchain.pem" ] && [ -f "nginx/ssl/privkey.pem" ]; then
        echo "  ✅ SSL certificates found"
      else
        echo "  ⚠️  SSL certificates missing"
        echo "  💡 Run './scripts/generate-ssl.sh' to create them"
      fi
    else
      echo "  ❌ SSL directory missing"
    fi
    echo ""
    
    # Check environment variables
    echo "🌍 Checking environment variables..."
    if [ -f "$ENV_FILE" ]; then
      echo "  ✅ Environment file found"
      echo "  📋 Key variables:"
      grep -E "^(DOMAIN_|POSTGRES_|API_|WEB_)" "$ENV_FILE" | head -5 | while read line; do
        echo "    $line"
      done
    else
      echo "  ❌ Environment file missing"
    fi
    ;;
  generate-config)
    echo "🔧 Generating nginx configuration..."
    if ! ./scripts/generate-nginx-config.sh; then
      echo "❌ Failed to generate nginx configuration!"
      exit 1
    fi
    echo "✅ Configuration generated successfully"
    ;;
  monitor-memory)
    echo "📊 docker container memory usage (snapshot):"
    docker stats --no-stream
    echo ""
    echo "🖥️  system memory usage (free -h):"
    free -h
    ;;
  *)
    echo "Usage: $0 {up|down|rebuild [service]|backup-now|backup-status|backup-logs|restore-backup <file>|logs [service]|restart [service]|clean-cache [service]|check|generate-config|monitor-memory}"
    echo ""
    echo "Commands:"
    echo "  up                      - Start all services and setup backup cron"
    echo "  down                    - Stop all services (with option to remove backup cron)"
    echo "  rebuild [service]       - Rebuild and restart service(s)"
    echo "  backup-now             - Create immediate database backup via host cron script"
    echo "  backup-status          - Show backup cron status and available backups"
    echo "  backup-logs            - Show backup logs from host system"
    echo "  restore-backup <file>  - Restore database from backup file"
    echo "  logs [service]         - Show service logs (all services if no service specified)"
    echo "  restart [service]      - Restart service(s)"
    echo "  clean-cache [service]  - Clean Docker cache, remove containers/images/volumes and rebuild"
    echo "  check                  - Run pre-deployment checks"
    echo "  generate-config        - Generate nginx configuration"
    echo "  monitor-memory         - Show memory usage for all project containers and system"
    echo ""
    echo "Backup Management:"
    echo "  • Backups are managed via host-level cron jobs (not Docker containers)"
    echo "  • Run './scripts/setup-backup-cron.sh status' for detailed backup info"
    echo "  • Backup logs: /var/log/spenicle-backup.log"
    echo ""
    print_env_info
    exit 1
    ;;
esac
