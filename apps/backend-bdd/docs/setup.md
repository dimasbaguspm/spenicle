# E2E Test Environment Setup

This document describes the isolated E2E testing environment for the Spenicle API.

## Overview

The E2E tests run in a completely isolated Docker environment with:

- **Separate PostgreSQL instance** with isolated data volume
- **Separate backend API instance**
- **Isolated Docker network** to avoid conflicts with dev environment

This ensures E2E tests don't interfere with your development database and can run in parallel with local development.

## Quick Start

### 1. Configure Environment

The E2E environment is driven by `docker compose` and the service environment
values in `docker-compose.yml`. Values are defined in the compose files and
must be changed there when you need different settings.
Edit `apps/backend-bdd/docker-compose.yml` (or `scripts/docker-compose.build.yaml` for CI) to change ports, credentials, or secrets for local development or CI runs.

### 2. Start the E2E Environment

```bash
sudo docker compose up -d
```

This will:

- Start PostgreSQL (container: `spenicle-e2e-postgres`)
- Build and start the backend API (container: `spenicle-e2e-api`)
- Run database migrations
- Wait for services to be healthy

### 3. Run Tests

```bash
bun run test
```

### 4. Stop the E2E Environment

```bash
sudo docker compose down
```

To also remove volumes:

```bash
sudo docker compose down -v
```

## Available Commands

| Command                       | Description                              |
| ----------------------------- | ---------------------------------------- |
| `sudo docker compose up -d`   | Start E2E environment (PostgreSQL + API) |
| `sudo docker compose down`    | Stop E2E environment                     |
| `sudo docker compose down -v` | Stop and remove volumes                  |
| `sudo docker compose logs -f` | View logs from E2E services              |
| `sudo docker compose build`   | Rebuild Docker images                    |
| `bun run test`                | Run E2E tests                            |
| `bun run test:debug`          | Debug tests                              |
| `bun run test:headed`         | Run tests in headed mode                 |
| `bun run test:report`         | View HTML test report                    |
| `bun run generate:types`      | Generate OpenAPI types                   |

## Environment Configuration

### E2E Environment Variables

Configuration values live in `docker-compose.yml` for the E2E environment.
`apps/backend-bdd/.env.example` remains as a reference template but is not
required to run the environment. To change values, edit the compose file(s)
directly; the CI workflow uses the values from `scripts/docker-compose.build.yaml`.

Typical values you may want to override:

- `DB_HOST` (defaults to the PostgreSQL service name used in compose)
- `DB_PORT` (container port exposed on the host)
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `APP_PORT` (default API listen port: 8080)
- `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

When running in CI the workflow uses the values hardcoded in
`scripts/docker-compose.build.yaml` for deterministic test runs; do not expect
a generated `.env` file.

### Docker Services

The `docker-compose.yml` defines:

- **spenicle-e2e-postgres**: PostgreSQL 16

  - Volume: `spenicle_e2e_postgres_data`
  - Network: `spenicle_e2e`
  - Port: Configurable via `DB_PORT` in `docker-compose.yml`

- **spenicle-e2e-api**: Backend API
  - Connects to E2E PostgreSQL
  - Network: `spenicle_e2e`
  - Port: Configurable via `APP_PORT` in `docker-compose.yml`
  - Health checks enabled

The E2E environment uses:

- Separate Docker containers (`spenicle-e2e-postgres`, `spenicle-e2e-api`)
- Isolated Docker network (`spenicle_e2e`)
- Separate data volume (`spenicle_e2e_postgres_data`)

Configure ports via `docker-compose.yml` to avoid conflicts with your
development environment.

### Why Isolation?

1. **Data Safety**: E2E tests won't affect your development data
2. **Parallel Development**: Run tests while developing without conflicts
3. **Reproducibility**: Fresh environment for each test run
4. **CI/CD Ready**: Easy to run in GitHub Actions or other CI systems
5. **Easy Cleanup**: `docker compose down -vt affect your development data
6. **Parallel Development**: Run tests while developing without conflicts
7. **Reproducibility**: Fresh environment for each test run
8. **CI/CD Ready**: Easy to run in GitHub Actions or other CI systems
9. **Easy Cleanup**: `docker:reset` gives you a fresh start

## Troubleshooting

, update the ports by editing `docker-compose.yml` or the CI compose file:

```bash
# Check what's using the ports
lsof -i :5432
lsof -i :8080

# Edit the ports in `docker-compose.yml` and restart the compose environment
sudo docker compose down -v
sudo docker compose up -d
```

### Tests Failing After Environment Start

Wait for services to be healthy:

```bash
# Check service status
sudo docker compose ps

# View logs
sudo docker compose logs -f

# Check backend API health
curl http://localhost:8080/docs
```

### Clean Slate

For a completely fresh start:

```bash
sudo docker compose down -v
sudo docker compose up -d --build
```

This will:

- Stop all E2E containers
- Delete all E2E volumes
- Rebuild images
- Start fresh containers

### Inspecting the Database

Connect to the E2E database:

```bash
sudo docker exec -it spenicle-e2e-postgres psql -U my_username -d spenicle_e2e-test
```

Or use your favorite PostgreSQL client with credentials from the compose
configuration.

- Password: `spenicle_e2e_password`

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: cd apps/backend-bdd && bun install

      - name: Start E2E environment
        run: cd apps/backend-bdd && docker compose up -d --build

      - name: Wait for services
        run: sleep 10

      - name: Run E2E tests
        run: cd apps/backend-bdd && bun run test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report

      - name: Cleanup
        if: always()
        run: cd apps/backend-bdd && docker compose down -v

Notes:
  - Use `docker compose logs -f` to debug failing tests.
  - Do not commit local secret files; prefer using CI secrets or editing the
    compose files in source control for deterministic configuration.
```

## Next Steps

- See [writing-tests.md](./writing-tests.md) for test writing guidelines
- See [fixture-architecture.md](./fixture-architecture.md) for fixture patterns
- Check [../specs](../specs) for example tests
