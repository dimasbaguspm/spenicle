# Spenicle API

[![CI](https://github.com/dimasbaguspm/spenicle-api/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dimasbaguspm/spenicle-api/actions/workflows/ci.yml)

## Quickstart (local)

1. Install Go 1.25+ and a Postgres instance (or use Docker).
2. Run tests, format, and build:

```bash
go test ./... -v
gofmt -w .

```

3. Configure `DATABASE_URL` and other env vars, then run:

```bash
go run main.go
```

## Project structure

- `cmd/app` — application bootstrap and wiring
- `internal/resources/` — HTTP resources (Huma handlers)
- `internal/services/` — business logic and validation
- `internal/repositories/` — DB access and SQL
- `internal/database/schemas/` — DTOs with Huma validation tags
- `internal/database/migrations/` — SQL migrations
- `internal/observability/` — logging and tracing helpers
- `internal/utils` - global shared utils
- `docs/` — design notes and testing standards

## Developer notes

- Follow `docs/code_standards.md` for patterns and conventions.
- When changing DB schema, add SQL migrations under `internal/database/migrations/`.
- Tests:
  - Repository tests: use `pgxmock`.
  - Resource tests: use `humatest` with mocked services.

## Contributing

- Open a PR against `main` with focused commits and tests.
- Ensure `go test ./...` passes and code is formatted.

## Author

- @dimasbaguspm
