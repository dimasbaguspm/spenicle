#!/usr/bin/env bash

set -e

# PostgreSQL management script for SpendLess API
# This script helps to initialize, start, stop, and check the status of your PostgreSQL server

# Variables should be set by the Nix shell, but let's make sure they're available
if [ -z "$API_PGDATA" ]; then
  export API_PGDATA="$PWD/.direnv/postgres"
fi

if [ -z "$API_PGHOST" ]; then
  export API_PGHOST="$API_PGDATA"
fi

if [ -z "$API_PGUSER" ]; then
  export API_PGUSER="postgres"
fi

if [ -z "$API_PGDATABASE" ]; then
  export API_PGDATABASE="spenicle"
fi

if [ -z "$API_PGPORT" ]; then
  export API_PGPORT="5433"
fi

function show_help {
  echo "PostgreSQL management script for SpendLess API"
  echo ""
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  init        Initialize the PostgreSQL database cluster"
  echo "  start       Start the PostgreSQL server"
  echo "  stop        Stop the PostgreSQL server"
  echo "  status      Check if the PostgreSQL server is running"
  echo "  check-port  Verify which port PostgreSQL is using"
  echo "  create-db   Create the database if it doesn't exist"
  echo "  reset-db    Reset the entire database (WARNING: Destroys all data)"
  echo "  help        Show this help message"
  echo ""
}

function init_db {
  # Set environment variables for PostgreSQL commands
  export PGDATA="$API_PGDATA"

  if [ -d "$API_PGDATA" ]; then
    echo "PostgreSQL data directory already exists at $API_PGDATA"
    echo "If you want to reinitialize, please delete this directory first"
    return 1
  fi

  echo "Initializing PostgreSQL database cluster at $API_PGDATA..."
  mkdir -p "$API_PGDATA"
  
  # Initialize with a specific username that matches API_PGUSER
  initdb --auth=trust --no-locale --encoding=UTF8 --username="$API_PGUSER" -D "$API_PGDATA"
  
  echo "PostgreSQL database cluster initialized successfully with user '$API_PGUSER'"
}

function start_db {
  # Set environment variables for PostgreSQL commands
  export PGDATA="$API_PGDATA"
  export PGHOST="$API_PGHOST"
  export PGUSER="$API_PGUSER"
  export PGDATABASE="$API_PGDATABASE"
  export PGPORT="$API_PGPORT"

  if is_running; then
    echo "PostgreSQL server is already running"
    return 0
  fi

  if [ ! -d "$API_PGDATA" ]; then
    echo "PostgreSQL data directory does not exist at $API_PGDATA"
    echo "Please run '$0 init' first"
    return 1
  fi

  echo "Starting PostgreSQL server..."
  # Use the default PostgreSQL port (5433) unless specified otherwise
  local pg_port=${API_PGPORT:-5433}
  
  # Ensure the data directory exists and is writable for logs
  mkdir -p "$API_PGDATA"
  
  pg_ctl start -l "$API_PGDATA/logfile" -o "--unix_socket_directories='$API_PGHOST' --port=$pg_port" -D "$API_PGDATA"
  echo "PostgreSQL server started on port $pg_port"
}

function stop_db {
  # Set environment variables for PostgreSQL commands
  export PGDATA="$API_PGDATA"

  if ! is_running; then
    echo "PostgreSQL server is not running"
    return 0
  fi

  echo "Stopping PostgreSQL server..."
  pg_ctl stop -m fast -D "$API_PGDATA"
}

function is_running {
  pg_ctl status -D "$API_PGDATA" > /dev/null 2>&1
  return $?
}

function status_db {
  # Set environment variables for PostgreSQL commands
  export PGDATA="$API_PGDATA"

  if is_running; then
    echo "PostgreSQL server is running"
    
    # Get the port number PostgreSQL is using
    local pg_port
    if [ -f "$API_PGDATA/postmaster.pid" ]; then
      pg_port=$(head -n 4 "$API_PGDATA/postmaster.pid" | tail -n 1)
    else
      pg_port=5433 # Default PostgreSQL port for this project
    fi
    
    echo "Connection info:"
    echo "  Host: $API_PGHOST"
    echo "  Port: $pg_port"
    echo "  User: $API_PGUSER"
    echo "  Database: $API_PGDATABASE"
    echo "  URL: postgresql://$API_PGUSER@localhost:$pg_port/$API_PGDATABASE"
  else
    echo "PostgreSQL server is not running"
  fi
}

function create_database {
  # Set environment variables for PostgreSQL commands
  export PGDATA="$API_PGDATA"
  export PGHOST="$API_PGHOST"
  export PGUSER="$API_PGUSER"
  export PGDATABASE="$API_PGDATABASE"
  export PGPORT="$API_PGPORT"

  if ! is_running; then
    echo "PostgreSQL server is not running"
    echo "Please run '$0 start' first"
    return 1
  fi

  # Check if database exists
  if psql -lqt | cut -d \| -f 1 | grep -qw "$API_PGDATABASE"; then
    echo "Database '$API_PGDATABASE' already exists"
    return 0
  fi

  echo "Creating database '$API_PGDATABASE'..."
  createdb "$API_PGDATABASE"
  echo "Database created successfully"
}

function check_port {
  # Set environment variables for PostgreSQL commands
  export PGDATA="$API_PGDATA"
  export PGHOST="$API_PGHOST"
  export PGUSER="$API_PGUSER"
  export PGDATABASE="$API_PGDATABASE"
  export PGPORT="$API_PGPORT"

  if ! is_running; then
    echo "PostgreSQL server is not running"
    return 1
  fi
  
  # Get the port from postmaster.pid
  local pg_port
  if [ -f "$API_PGDATA/postmaster.pid" ]; then
    pg_port=$(head -n 4 "$API_PGDATA/postmaster.pid" | tail -n 1)
    echo "PostgreSQL is running on port: $pg_port"
    
    # Verify if the port is actually in use
    if netstat -tuln | grep -q ":$pg_port.*LISTEN"; then
      echo "✅ Confirmed: Port $pg_port is in use and listening"
    else
      echo "❌ Warning: Port $pg_port is configured but not listening"
    fi
    
    # Try a test connection
    if psql -p "$pg_port" -U "$API_PGUSER" -d "$API_PGDATABASE" -c "SELECT 1" > /dev/null 2>&1; then
      echo "✅ Connection test: Successfully connected to PostgreSQL on port $pg_port"
    else
      echo "❌ Connection test: Failed to connect to PostgreSQL on port $pg_port"
    fi
  else
    echo "Could not determine PostgreSQL port: postmaster.pid not found"
    return 1
  fi
}

function reset_db {
  # Set environment variables for PostgreSQL commands
  export PGDATA="$API_PGDATA"

  if is_running; then
    echo "Stopping PostgreSQL server first..."
    stop_db
  fi
  
  echo "Removing PostgreSQL data directory at $API_PGDATA..."
  rm -rf "$API_PGDATA"
  
  echo "Reinitializing database..."
  init_db
  start_db
  create_database
  
  echo "PostgreSQL database has been reset successfully"
}

# Main script
case "$1" in
  init)
    init_db
    ;;
  start)
    start_db
    ;;
  stop)
    stop_db
    ;;
  status)
    status_db
    ;;
  check-port)
    check_port
    ;;
  create-db)
    create_database
    ;;
  reset-db)
    read -p "WARNING: This will delete all data. Are you sure? (y/N) " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      reset_db
    else
      echo "Database reset cancelled."
    fi
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Unknown command: $1"
    show_help
    exit 1
    ;;
esac
