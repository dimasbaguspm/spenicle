# Spenicle — Quick Start

This quick start shows how to run Spenicle using Docker or Docker Compose. For architecture and development details, see [architecture.md](architecture.md).

## At a glance

| Item            | Value                                  |
| --------------- | -------------------------------------- |
| Image           | `ghcr.io/dimasbaguspm/spenicle:latest` |
| Default port    | `3000` (HTTP)                          |
| Target platform | `linux/amd64`                          |

## Required environment variables

| Variable         | Example / Notes                          |
| ---------------- | ---------------------------------------- |
| `DB_HOST`        | `spenicle-postgres` (when using compose) |
| `DB_PORT`        | `5432`                                   |
| `DB_USER`        | database username                        |
| `DB_PASSWORD`    | database password                        |
| `DB_NAME`        | database name                            |
| `ADMIN_USERNAME` | initial admin username                   |
| `ADMIN_PASSWORD` | initial admin password                   |
| `JWT_SECRET`     | cryptographic secret for JWT tokens      |

Minimal setup: the `docker-compose.yml` provided in the repo supplies
reasonable defaults for local development. To change configuration values,
edit the appropriate `docker-compose.yml` for the app you are running.

## Run with Docker

1. Configure environment (recommended):

The Compose files drive development configuration so creating a local `.env`
is not required. To change values edit the compose file(s) for the app instead
of using a runtime override file.

2. Run the container (binds port 3000):

```bash
docker run --rm -p 3000:3000 ghcr.io/dimasbaguspm/spenicle:latest
```

After the container starts, open http://localhost:3000 in your browser
