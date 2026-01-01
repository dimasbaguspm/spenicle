# Spenicle API

[![CI](https://github.com/dimasbaguspm/spenicle-api/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/dimasbaguspm/spenicle-api/actions/workflows/ci.yml)

## Purpose

Spenicle API is a lightweight Go service that exposes CRUD endpoints for financial accounts. It uses Chi for routing and Huma for OpenAPI generation and request/response validation.

## Project structure (high level)

- `main.go`, `routes.go` — application bootstrap and router setup
- `resource/` — HTTP resources and Huma endpoint registrations
- `internal/database/repositories/` — repository layer (SQL persistence)
- `internal/database/schema/` — DTOs and validation tags (Huma)
- `internal/database/migrations/` — SQL migrations
- `docs/` — documentation and code standards

## Quickstart (local)

1. Install Go 1.25+.
2. Run tests and build:

```bash
go test ./... -v
gofmt -w .
go build ./...
```

3. Run the app:

```bash
go run main.go
```

- OpenAPI is served by Huma when the running server exposes the `/openapi.json` endpoint (see `routes.go`).

## Developer notes

- Follow `docs/code_standards.md` for architecture and conventions.
- If working on account-related code, read `docs/account_service.md` first.
- Use `humatest` for endpoint tests and `pgxmock` for repository tests.
- Use the root `copilot-instructions.md` for the agent checklist.

## Contributing

- Open a PR against `main` with focused commits and tests for new behavior.
- Ensure `go test ./...` passes and formatting is applied.

## Author

Author: @dimasbaguspm
