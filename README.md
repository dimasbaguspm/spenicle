# Spenicle

A personal finance management application with budget tracking, transaction management, and comprehensive reporting features.

**Author:** [dimasbaguspm](https://github.com/dimasbaguspm)  
**License:** MIT

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [Option 1: Docker Compose (Recommended)](#option-1-docker-compose-recommended)
  - [Option 2: Standalone Docker](#option-2-standalone-docker)
- [Environment Variables](#environment-variables)
- [Accessing the Application](#accessing-the-application)
- [Development](#development)

---

## Overview

| Item            | Value                                  |
| --------------- | -------------------------------------- |
| Image           | `ghcr.io/dimasbaguspm/spenicle:latest` |
| Default port    | `3000` (HTTP)                          |
| Target platform | `linux/amd64`                          |
| Database        | PostgreSQL 15+                         |

For architecture and development details, see [architecture.md](architecture.md).

---

## Prerequisites

Before running Spenicle, ensure you have:

- **Docker** (version 20.10+) and **Docker Compose** (version 2.0+)
- **PostgreSQL 15+** (can be run via Docker Compose - see below)
- At least **1GB RAM** and **500MB disk space**

## Quick Start

### Option 1: Docker Compose (Recommended)

This is the easiest way to get started. It automatically sets up both Spenicle and PostgreSQL.

1. **Create a `docker-compose.yml` file:**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15-alpine
    container_name: spenicle-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: spenicle_db
      POSTGRES_USER: spenicle_user
      POSTGRES_PASSWORD: change-me-in-production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U spenicle_user -d spenicle_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  spenicle:
    image: ghcr.io/dimasbaguspm/spenicle:latest
    container_name: spenicle-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: spenicle_user
      DB_PASSWORD: change-me-in-production
      DB_NAME: spenicle_db
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

Open your browser and navigate to `http://localhost:3000`

### Option 2: Standalone Docker

If you already have a PostgreSQL database running, you can run Spenicle standalone.

1. **Pull the image:**

```bash
docker pull ghcr.io/dimasbaguspm/spenicle:latest
```

2. **Run the container:**

```bash
docker run -d \
  --name spenicle-app \
  -p 3000:3000 \
  -e DB_HOST=your-postgres-host \
  -e DB_PORT=5432 \
  -e DB_USER=spenicle_user \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=spenicle_db \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your-admin-password \
  -e JWT_SECRET=your-secret-key-min-32-chars \
  ghcr.io/dimasbaguspm/spenicle:latest
```

## Environment Variables

| Variable         | Required | Description                              | Example                      |
| ---------------- | -------- | ---------------------------------------- | ---------------------------- |
| `DB_HOST`        | Yes      | PostgreSQL host address                  | `postgres` or `192.168.1.10` |
| `DB_PORT`        | Yes      | PostgreSQL port                          | `5432`                       |
| `DB_USER`        | Yes      | Database username                        | `spenicle_user`              |
| `DB_PASSWORD`    | Yes      | Database password                        | `secure-password`            |
| `DB_NAME`        | Yes      | Database name                            | `spenicle_db`                |
| `ADMIN_USERNAME` | Yes      | Initial admin username for first login   | `admin`                      |
| `ADMIN_PASSWORD` | Yes      | Initial admin password for first login   | `admin-password`             |
| `JWT_SECRET`     | Yes      | Secret key for JWT tokens (min 32 chars) | `your-32-char-secret-key`    |

> **Note:** Always change default passwords in production environments!

## Accessing the Application

Once the application is running:

- **Web UI:** http://localhost:3000
- **API Documentation:** http://localhost:3000/docs (OpenAPI/Swagger)
- **Health Check:** http://localhost:3000/health

**Default credentials (first-time login):**

- Username: `admin` (or value from `ADMIN_USERNAME`)
- Password: `admin-password` (or value from `ADMIN_PASSWORD`)

## Development

For local development and contributing:

1. **Clone the repository:**

```bash
git clone https://github.com/dimasbaguspm/spenicle.git
cd spenicle
```

2. **Read the documentation:**

   - Architecture: [architecture.md](architecture.md)
   - Backend development: [apps/backend/docs/](apps/backend/docs/)
   - Frontend development: [apps/web/docs/](apps/web/docs/)
   - Backend testing: [apps/backend-bdd/docs/](apps/backend-bdd/docs/)

3. **Start development environment:**

Refer to the specific app directory for development instructions.

## Support

For issues, questions, or contributions:

- **Issues:** https://github.com/dimasbaguspm/spenicle/issues
- **Discussions:** https://github.com/dimasbaguspm/spenicle/discussions
