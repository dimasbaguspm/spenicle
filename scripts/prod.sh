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
    echo "🚀 Starting services..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    ;;
  down)
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down
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
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T db-backup /scripts/backup-db-cron.sh
    ;;
  backup-status)
    echo "📊 Backup service status:"
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps db-backup
    echo ""
    echo "📁 Available backups:"
    if [ -d "backups" ]; then
      ls -la backups/spenicle_backup_*.sql.gz 2>/dev/null || echo "  No automated backups found"
    else
      echo "  Backups directory not found"
    fi
    ;;
  backup-logs)
    echo "📋 Backup service logs:"
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs db-backup
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
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f
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
      
      # Remove the container
      echo "  🗑️  Removing container for: $SERVICE"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE rm -f $SERVICE
      
      # Remove the image
      IMAGE_NAME=$(docker compose -f $COMPOSE_FILE --env-file $ENV_FILE config | grep -A5 "$SERVICE:" | grep "image:" | awk '{print $2}')
      if [ -n "$IMAGE_NAME" ]; then
        echo "  🗑️  Removing image: $IMAGE_NAME"
        docker rmi -f $IMAGE_NAME 2>/dev/null || echo "  ⚠️  Image $IMAGE_NAME not found or already removed"
      fi
      
      # Rebuild the service (without starting)
      echo "  🔨 Rebuilding service: $SERVICE"
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache $SERVICE
      echo "  ✅ Cache cleaned and service rebuilt for: $SERVICE"
      echo "  💡 Run './scripts/prod.sh up' to start all services"
    else
      echo "Cleaning cache for all services"
      
      # Stop all services
      echo "  🛑 Stopping all services..."
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down
      
      # Remove all containers and images
      echo "  🗑️  Removing containers..."
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE rm -f
      
      # Remove dangling images and build cache
      echo "  🗑️  Removing dangling images and build cache..."
      docker image prune -f
      docker builder prune -f
      
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
  *)
    echo "Usage: $0 {up|down|rebuild [service]|backup-now|backup-status|backup-logs|restore-backup <file>|logs|restart [service]|clean-cache [service]|check|generate-config}"
    echo ""
    echo "Commands:"
    echo "  up                      - Start all services"
    echo "  down                    - Stop all services"
    echo "  rebuild [service]       - Rebuild and restart service(s)"
    echo "  backup-now             - Trigger immediate automated backup"
    echo "  backup-status          - Show backup service status and available backups"
    echo "  backup-logs            - Show backup service logs"
    echo "  restore-backup <file>  - Restore database from automated backup"
    echo "  logs                   - Show service logs"
    echo "  restart [service]      - Restart service(s)"
    echo "  clean-cache [service]  - Clean Docker cache and rebuild (without auto-start)"
    echo "  check                  - Run pre-deployment checks"
    echo "  generate-config        - Generate nginx configuration"
    echo ""
    print_env_info
    exit 1
    ;;
esac
