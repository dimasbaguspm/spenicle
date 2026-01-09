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

Copy the example environment file and update with your credentials:

```bash
cd apps/backend-bdd
cp .env.example .env
# Edit .env with your preferred settings
```

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

Configuration is stored in `.env` (copy from `.env.example`):

```bash
# Database Configuration
DB_HOST=spenicle-e2e-postgres
DB_PORT=5432
DB_USER=my_username
DB_PASSWORD=my_password
DB_NAME=spenicle_e2e-test

APP_PORT=8080

# JWT secret for authentication
JWT_SECRET=your-secret-key-change-this-in-production

# Admin Credentials
ADMIN_USERNAME=my_username
ADMIN_PASSWORD=my_password
```

**Note:**

- `DB_HOST` must match the PostgreSQL container name in docker-compose.yml
- `APP_PORT` is the port the API listens on (default: 8080)
- Update `ADMIN_USERNAME` and `ADMIN_PASSWORD` for test authentication
- The `.env` file is gitignored, so it won't be committed

### Docker Services

The `docker-compose.yml` defines:

- **spenicle-e2e-postgres**: PostgreSQL 16

  - Volume: `spenicle_e2e_postgres_data`
  - Network: `spenicle_e2e`
  - Port: Configurable via `DB_PORT` in .env

- **spenicle-e2e-api**: Backend API
  - Connects to E2E PostgreSQL
  - Network: `spenicle_e2e`
  - Port: Configurable via `APP_PORT` in .env
  - Health checks enabled

The E2E environment uses:

- Separate Docker containers (`spenicle-e2e-postgres`, `spenicle-e2e-api`)
- Isolated Docker network (`spenicle_e2e`)
- Separate data volume (`spenicle_e2e_postgres_data`)

Configure ports in `.env` to avoid conflicts with your development environment.

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

, update the ports in `.env`:

```bash
# Check what's using the ports
lsof -i :5432
lsof -i :8080

# Edit .env to use different ports
DB_PORT=5433
APP_PORT=8081
lsof -i :8081

# Or use different ports by editing docker-compose.e2e.yml
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

Or use your favorite PostgreSQL client with credentials from `.env`.

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
          name: playwright-report compose down -v && docker compose up -d --build` before important test runs
2. **Check logs**: Use `docker compose logs -f` to debug failing tests
3. **Don't commit .env**: Keep your local .env gitignored, use .env.example as template
      - name: Cleanup
        if: always()
        run: cd apps/backend-bdd && docker compose down -v
│  └─────────────────┘   └────────────────┘  │
│           │                      ▲          │
│           │                      │          │
│     ┌─────▼──────┐              │          │
│     │  Volume    │              │          │
│     │  (isolated)│              │          │
│     └────────────┘              │          │
│                                 │          │
└─────────────────────────────────┼──────────┘
                                  │
                      ┌───────────▼──────────┐
                      │  Playwright Tests    │
                      │  (localhost:8081)    │
                      └──────────────────────┘
```

## Next Steps

- See [writing-tests.md](./writing-tests.md) for test writing guidelines
- See [fixture-architecture.md](./fixture-architecture.md) for fixture patterns
- Check [../specs](../specs) for example tests
