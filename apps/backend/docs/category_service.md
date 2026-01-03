# Category Service — Summary

Purpose: manage category CRUD with clear separation of concerns.

Where to look

- Resource: `internal/resources/category_resource.go`
- Service: `internal/services/category_service.go`
- Repository: `internal/repositories/category_repository.go`
- Schemas: `internal/database/schemas/`

Core endpoints (JWT protected)

- GET /categories — paginated list (filters via `SearchParamCategorySchema`)
- POST /categories — create (`CreateCategorySchema`) → 201
- GET /categories/{id} — retrieve by id → 200 or 404
- PATCH /categories/{id} — partial update (`UpdateCategorySchema`) → 200
- DELETE /categories/{id} — soft delete → 204

Validation & errors

- Schema-level validation: Huma tags on DTOs → 422
- Business validation: service layer (e.g., "at least one field to update") → 400
- Not found: repository/service → 404

DB notes

- Repositories accept a small `DB` interface for testability and use `RETURNING`/`COALESCE` patterns.
- Soft delete implemented via `deleted_at` timestamp.
- Category type enum: `expense`, `income`, `transfer` (supports transaction categorization)

Schema structure

- **CategorySchema**: full entity with timestamps
- **CreateCategorySchema**: name, type (required), note (optional)
- **UpdateCategorySchema**: all fields optional (partial update)
- **SearchParamCategorySchema**: pagination + filters (name, type, orderBy, orderDirection)
- **PaginatedCategorySchema**: wrapper with pagination metadata + items array

Quick commands

```bash
go test ./internal/services -v -run TestCategory
go test ./internal/repositories -v -run TestCategory
go test ./internal/resources -v -run TestCategory
```

For full details and examples, see the schema files in `internal/database/schemas/category_*.go` and `docs/testing_standards.md`.
