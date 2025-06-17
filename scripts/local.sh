#!/usr/bin/env bash
set -e

# Use docker-compose.dev.yml for local development
COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE=".env.dev"

# Function to print environment info
print_env_info() {
  echo "🚀 Spenicle Local Development Environment"
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
  seed)
    echo "🌱 Seeding development database..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec api yarn db:seed
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
      echo "  💡 Run './scripts/local.sh up' to start all services"
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
      echo "  💡 Run './scripts/local.sh up' to start all services"
    fi
    ;;
  check)
    echo "🔍 Pre-deployment checks (Development):"
    echo ""
    
    # Check if required files exist
    echo "📁 Checking required files..."
    for file in "$COMPOSE_FILE" "$ENV_FILE"; do
      if [ -f "$file" ]; then
        echo "  ✅ $file ($(du -h "$file" | cut -f1))"
      else
        echo "  ❌ $file (missing)"
      fi
    done
    echo ""
    
    # Check environment variables
    echo "🌍 Checking environment variables..."
    if [ -f "$ENV_FILE" ]; then
      echo "  ✅ Environment file found"
      echo "  📋 Key variables:"
      grep -E "^(NODE_ENV|API_|WEB_|POSTGRES_)" "$ENV_FILE" | head -5 | while read line; do
        echo "    $line"
      done
    else
      echo "  ❌ Environment file missing"
    fi
    
    # Check Docker
    echo ""
    echo "🐳 Checking Docker..."
    if command -v docker >/dev/null 2>&1; then
      echo "  ✅ Docker is installed"
      if docker info >/dev/null 2>&1; then
        echo "  ✅ Docker daemon is running"
      else
        echo "  ❌ Docker daemon is not running"
      fi
    else
      echo "  ❌ Docker is not installed"
    fi
    ;;
  generate-config)
    echo "ℹ️  Note: Config generation is typically not needed for local development."
    echo "🔧 For development, services usually run without nginx proxy."
    echo ""
    echo "If you need to test production-like setup locally, consider:"
    echo "  1. Using './scripts/prod.sh generate-config' instead"
    echo "  2. Or running services individually without Docker Compose"
    ;;
  *)
    echo "Usage: $0 {up|down|rebuild [service]|seed|backup-now|backup-status|backup-logs|restore-backup <file>|logs [service]|restart [service]|clean-cache [service]|check|generate-config}"
    echo ""
    echo "Commands:"
    echo "  up                      - Start all services"
    echo "  down                    - Stop all services"
    echo "  rebuild [service]       - Rebuild and restart service(s)"
    echo "  seed                    - Seed development database with fake data"
    echo "  backup-now             - Trigger immediate automated backup"
    echo "  backup-status          - Show backup service status and available backups"
    echo "  backup-logs            - Show backup service logs"
    echo "  restore-backup <file>  - Restore database from automated backup"
    echo "  logs [service]         - Show service logs (all services if no service specified)"
    echo "  restart [service]      - Restart service(s)"
    echo "  clean-cache [service]  - Clean Docker cache, remove containers/images/volumes and rebuild"
    echo "  check                  - Run pre-deployment checks"
    echo "  generate-config        - Info about config generation (dev mode)"
    echo ""
    print_env_info
    exit 1
    ;;
esac
