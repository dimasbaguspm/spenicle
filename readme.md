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

1. Docker

```bash
docker run --rm -p 3000:3000 \
	-e DB_HOST=spenicle-postgres \
	-e DB_PORT=5432 \
	-e DB_USER=spenicle_user \
	-e DB_PASSWORD=change-me \
	-e DB_NAME=spenicle_db \
	-e ADMIN_USERNAME=admin \
	-e ADMIN_PASSWORD=admin-password \
	-e JWT_SECRET=replace-with-a-secret \
	ghcr.io/dimasbaguspm/spenicle:latest
```

2. Docker Compose

```yaml
services:
	spenicle:
		image: ghcr.io/dimasbaguspm/spenicle:latest
		restart: unless-stopped
		environment:
			DB_HOST: db_host
			DB_PORT: db_port
			DB_USER: db_user
			DB_PASSWORD: db_password
			DB_NAME: db_name
			ADMIN_USERNAME: admin_username
			ADMIN_PASSWORD: admin_password
			JWT_SECRET: replace-it-with-minimum-32-characters-for-secret
		ports:
			- "change-to-another-port:3000"
```
