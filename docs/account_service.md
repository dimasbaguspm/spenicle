# Account Service — Summary

Purpose: manage account CRUD with clear separation of concerns.

Where to look

- Resource: `internal/resources/account_resource.go`
- Service: `internal/services/account_service.go`
- Repository: `internal/repositories/account_repository.go`
- Schemas: `internal/database/schemas/`

Core endpoints (JWT protected)

- GET /accounts — paginated list (filters via `SearchParamAccountSchema`)
- POST /accounts — create (`CreateAccountSchema`) → 201
- GET /accounts/{id} — retrieve by id → 200 or 404
- PATCH /accounts/{id} — partial update (`UpdateAccountSchema`) → 200
- DELETE /accounts/{id} — soft delete → 204

Validation & errors

- Schema-level validation: Huma tags on DTOs → 422
- Business validation: service layer (e.g., "at least one field to update") → 400
- Not found: repository/service → 404

DB notes

- Repositories accept a small `DB` interface for testability and use `RETURNING`/`COALESCE` patterns.
- Soft delete implemented via `deleted_at` timestamp.

Quick commands

```bash
go test ./... -v
gofmt -w .
```

For full details and examples, see the schema files in `internal/database/schemas/` and `docs/testing_standards.md`.
