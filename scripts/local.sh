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
    
    # Setup database backup cron job for development (every 6 hours)
    echo "🕒 Setting up database backup cron job..."
    if ./scripts/setup-backup-cron.sh setup $ENV_FILE 6; then
      echo "✅ Database backup cron job configured (every 6 hours)"
    else
      echo "⚠️  Warning: Failed to setup backup cron job. You can set it up manually:"
      echo "   ./scripts/setup-backup-cron.sh setup $ENV_FILE 6"
    fi
    
    echo ""
    echo "🎉 Development environment started successfully!"
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
  seed)
    echo "🌱 Seeding development database..."
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec api yarn db:seed
    ;;
  backup-now)
    echo "🗄️ Creating immediate database backup..."
    
    # Check if postgres service is running
    if ! docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps postgres --format table | grep -q "Up\|running"; then
      echo "❌ Error: Postgres service is not running"
      echo "💡 Run './scripts/local.sh up' to start services first"
      exit 1
    fi
    
    # Use the host backup script with better error handling
    if ./scripts/setup-backup-cron.sh backup-now $ENV_FILE; then
      echo "✅ Backup completed successfully!"
      echo "📁 Latest backups:"
      ls -lt backups/spenicle_backup_*.sql.gz 2>/dev/null | head -3 || echo "  No backups found"
    else
      echo "❌ Backup failed!"
      echo "📋 Check logs for details:"
      tail -10 /var/log/spenicle-backup.log 2>/dev/null || echo "  No logs available"
      exit 1
    fi
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
    
    # Step 2: Restore from backup using docker compose
    echo "  📥 Restoring data from backup..."
    if gunzip -c "backups/$BACKUP_FILE" | docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres psql -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-spenicle}"; then
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
  exec)
    SERVICE=${2:-""}
    COMMAND=${3:-""}
    
    # Get list of running services
    RUNNING_SERVICES=$(docker compose -f $COMPOSE_FILE --env-file $ENV_FILE ps --services --filter "status=running")
    
    if [ -z "$RUNNING_SERVICES" ]; then
      echo "❌ No services are currently running"
      echo "💡 Run './scripts/local.sh up' to start services first"
      exit 1
    fi
    
    # If no service specified, show available services and prompt
    if [ -z "$SERVICE" ]; then
      echo "🔧 Available running services:"
      echo "$RUNNING_SERVICES" | while read service; do
        echo "  📦 $service"
      done
      echo ""
      echo "Usage: $0 exec <service> [command]"
      echo "Examples:"
      echo "  $0 exec api                   # Open interactive shell in api container"
      echo "  $0 exec postgres              # Connect to postgres database"
      echo "  $0 exec api yarn db:migrate   # Run database migration"
      echo "  $0 exec api sh -c 'ls -la'    # Execute specific shell command"
      exit 1
    fi
    
    # Validate service exists and is running
    if ! echo "$RUNNING_SERVICES" | grep -q "^$SERVICE$"; then
      echo "❌ Service '$SERVICE' is not running or does not exist"
      echo "🔧 Available running services:"
      echo "$RUNNING_SERVICES" | while read service; do
        echo "  📦 $service"
      done
      exit 1
    fi
    
    # If no command specified, provide interactive shell based on service type
    if [ -z "$COMMAND" ]; then
      case "$SERVICE" in
        api)
          echo "🚀 Opening interactive shell in API container..."
          # Try to detect available shell in the container
          if docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T $SERVICE which bash >/dev/null 2>&1; then
            COMMAND="bash"
          elif docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T $SERVICE which sh >/dev/null 2>&1; then
            COMMAND="sh"
          else
            echo "❌ No shell found in container"
            exit 1
          fi
          ;;
        web)
          echo "🌐 Opening interactive shell in Web container..."
          # Try to detect available shell in the container
          if docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T $SERVICE which bash >/dev/null 2>&1; then
            COMMAND="bash"
          elif docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T $SERVICE which sh >/dev/null 2>&1; then
            COMMAND="sh"
          else
            echo "❌ No shell found in container"
            exit 1
          fi
          ;;
        postgres)
          echo "🗄️  Opening PostgreSQL shell..."
          COMMAND="psql -U \${POSTGRES_USER:-postgres} \${POSTGRES_DB:-spenicle}"
          ;;
        redis)
          echo "🔴 Opening Redis CLI..."
          COMMAND="redis-cli"
          ;;
        *)
          echo "🐚 Opening shell in $SERVICE container..."
          # Try to detect available shell in the container
          if docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T $SERVICE which bash >/dev/null 2>&1; then
            COMMAND="bash"
          elif docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T $SERVICE which sh >/dev/null 2>&1; then
            COMMAND="sh"
          else
            echo "❌ No shell found in container"
            exit 1
          fi
          ;;
      esac
      echo "  📡 Using shell: $COMMAND"
    else
      echo "🔧 Executing command in $SERVICE container: $COMMAND"
    fi
    
    # Execute the command with proper flags and error handling
    if [ "$COMMAND" = "bash" ] || [ "$COMMAND" = "sh" ] || echo "$COMMAND" | grep -q "psql\|redis-cli"; then
      # Interactive commands need -it flags
      if ! docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec $SERVICE $COMMAND; then
        echo "❌ Command execution failed"
        echo "💡 Try running with a different shell or check if the service is properly configured"
        exit 1
      fi
    else
      # Non-interactive commands can use -T flag to avoid TTY issues
      if ! docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T $SERVICE $COMMAND; then
        echo "❌ Command execution failed"
        echo "💡 Check command syntax and service configuration"
        exit 1
      fi
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
  monitor-memory)
    echo "📊 docker container resource usage (CPU, memory, network, disk I/O):"
    # docker stats shows cpu, memory, network, and block io for all containers
    docker stats --no-stream
    echo ""
    echo "🖥️  system memory usage (free -h):"
    free -h
    echo ""
    echo "🖥️  system cpu usage (top 5 processes):"
    ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%cpu | head -n 6
    echo ""
    echo "💾 system disk usage (df -h):"
    df -h
    ;;
  *)
    echo "Usage: $0 {up|down|rebuild [service]|seed|backup-now|backup-status|backup-logs|restore-backup <file>|logs [service]|restart [service]|exec <service> [command]|clean-cache [service]|check|generate-config|monitor-memory}"
    echo ""
    echo "Commands:"
    echo "  up                      - Start all services and setup backup cron (6-hour intervals)"
    echo "  down                    - Stop all services (with option to remove backup cron)"
    echo "  rebuild [service]       - Rebuild and restart service(s)"
    echo "  seed                    - Seed development database with fake data"
    echo "  backup-now             - Create immediate database backup via host cron script"
    echo "  backup-status          - Show backup cron status and available backups"
    echo "  backup-logs            - Show backup logs from host system"
    echo "  restore-backup <file>  - Restore database from backup file"
    echo "  logs [service]         - Show service logs (all services if no service specified)"
    echo "  restart [service]      - Restart service(s)"
    echo "  exec <service> [cmd]   - Execute command in running container (interactive shell if no command)"
    echo "  clean-cache [service]  - Clean Docker cache, remove containers/images/volumes and rebuild"
    echo "  check                  - Run pre-deployment checks"
    echo "  monitor-memory         - Show memory usage for all project containers and system"
    echo ""
    echo "Backup Management:"
    echo "  • backup-now: Create immediate database backup (for testing and manual backups)"
    echo "  • backup-status: Show cron status and list available backups"
    echo "  • Development backups run every 6 hours via host-level cron"
    echo "  • All backups use Docker Compose to access the database securely"
    echo "  • Run './scripts/setup-backup-cron.sh status' for detailed backup info"
    echo "  • Backup logs: /var/log/spenicle-backup.log"
    echo ""
    print_env_info
    exit 1
    ;;
esac
