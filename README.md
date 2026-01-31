# Spenicle

A personal finance management application with budget tracking, transaction management, and comprehensive reporting features.

**Author:** [dimasbaguspm](https://github.com/dimasbaguspm)  
**License:** MIT

## Overview

| Item            | Value                                  |
| --------------- | -------------------------------------- |
| Image           | `ghcr.io/dimasbaguspm/spenicle:latest` |
| Default port    | `3000` (HTTP)                          |
| Target platform | `linux/amd64`                          |
| Database        | PostgreSQL 15+                         |
| Cache           | Redis 8.4+                             |

## Prerequisites

- **Docker** (version 20.10+) and **Docker Compose** (version 2.0+)
- **PostgreSQL 15+** database
- **Redis 8.4+** cache server
- At least **1GB RAM** and **500MB disk space**

## Quick Start

### Option 1: Docker Compose (Recommended)

1. **Create a `docker-compose.yml` file:**

```yaml
services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: spenicle_db
      POSTGRES_USER: spenicle_user
      POSTGRES_PASSWORD: change-me-in-production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spenicle_user -d spenicle_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8.4.0-alpine
    restart: unless-stopped

  spenicle:
    image: ghcr.io/dimasbaguspm/spenicle:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: spenicle_user
      DB_PASSWORD: change-me-in-production
      DB_NAME: spenicle_db
      REDIS_URL: redis:6379
      ADMIN_USERNAME: admin
      ADMIN_PASSWORD: change-me-in-production
      JWT_SECRET: replace-with-minimum-32-characters-secret-key
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

2. **Start the application:**

```bash
docker compose up -d
```

### Option 2: Standalone Docker

If you have PostgreSQL running separately:

```bash
docker run -d \
  --name spenicle \
  -p 3000:3000 \
  -e DB_HOST=your-postgres-host \
  -e DB_PORT=5432 \
  -e DB_USER=spenicle_user \
  -e DB_PASSWORD=your-password \
  -e DB_NAME=spenicle_db \
  -e REDIS_URL=your-redis-host:6379 \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-admin-password \
  -e JWT_SECRET=your-32-char-secret-key \
  ghcr.io/dimasbaguspm/spenicle:latest
```

## Environment Variables

| Variable         | Required | Description                        |
| ---------------- | -------- | ---------------------------------- |
| `DB_HOST`        | Yes      | PostgreSQL host                    |
| `DB_PORT`        | Yes      | PostgreSQL port (default: 5432)    |
| `DB_USER`        | Yes      | Database username                  |
| `DB_PASSWORD`    | Yes      | Database password                  |
| `DB_NAME`        | Yes      | Database name                      |
| `REDIS_URL`      | Yes      | Redis host and port (host:port)    |
| `ADMIN_USERNAME` | Yes      | Initial admin username             |
| `ADMIN_PASSWORD` | Yes      | Initial admin password             |
| `JWT_SECRET`     | Yes      | JWT secret key (min 32 characters) |

## Accessing the Application

- **Web UI:** http://localhost:3000
- **API Docs:** http://localhost:3000/api/docs
- **Health Check:** http://localhost:3000/health

**Default login:** `admin` / `admin-password` (change immediately!)

## Support

- **Issues:** https://github.com/dimasbaguspm/spenicle/issues
