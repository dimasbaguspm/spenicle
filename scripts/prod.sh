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
  backup-db)
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres pg_dump -U postgres spenicle > backup.sql
    ;;
  restore-db)
    docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres psql -U postgres spenicle < backup.sql
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
    echo "Usage: $0 {up|down|rebuild [service]|backup-db|restore-db|logs|restart [service]|clean-cache [service]|check|generate-config}"
    echo ""
    echo "Commands:"
    echo "  up                    - Start all services"
    echo "  down                  - Stop all services"
    echo "  rebuild [service]     - Rebuild and restart service(s)"
    echo "  backup-db            - Create database backup"
    echo "  restore-db           - Restore database from backup"
    echo "  logs                 - Show service logs"
    echo "  restart [service]    - Restart service(s)"
    echo "  clean-cache [service] - Clean Docker cache and rebuild (without auto-start)"
    echo "  check                - Run pre-deployment checks"
    echo "  generate-config      - Generate nginx configuration"
    echo ""
    print_env_info
    exit 1
    ;;
esac
