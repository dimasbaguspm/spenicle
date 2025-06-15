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
    ./scripts/generate-nginx-config.sh
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
      # Stop the specific service
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE stop $SERVICE
      # Remove the container
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE rm -f $SERVICE
      # Remove the image
      IMAGE_NAME=$(docker compose -f $COMPOSE_FILE --env-file $ENV_FILE config | grep -A5 "$SERVICE:" | grep "image:" | awk '{print $2}')
      if [ -n "$IMAGE_NAME" ]; then
        docker rmi -f $IMAGE_NAME 2>/dev/null || echo "Image $IMAGE_NAME not found or already removed"
      fi
      # Rebuild and start the service
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache $SERVICE
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d $SERVICE
    else
      echo "Cleaning cache for all services"
      # Stop all services
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE down
      # Remove all containers and images
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE rm -f
      # Remove dangling images and build cache
      docker image prune -f
      docker builder prune -f
      # Rebuild all services
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE build --no-cache
      docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    fi
    ;;
  *)
    echo "Usage: $0 {up|down|rebuild [service]|backup-db|restore-db|logs|restart [service]|clean-cache [service]}"
    echo ""
    print_env_info
    exit 1
    ;;
esac
