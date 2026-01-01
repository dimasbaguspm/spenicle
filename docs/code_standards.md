# Code Standards — Account API

## Overview

This document describes the code patterns, design choices, file structure, and a step-by-step recipe for adding an endpoint in this codebase.

## Design Pattern

- Resource + Repository pattern:
  - `resource/*` implements HTTP handlers (Huma operations) and contains request/response types and business-level validation.
  - `internal/database/repositories/*` implements DB access (SQL) and returns schema DTOs.
  - Resources use an interface (e.g., `AccountStore`) so repositories can be mocked for endpoint tests.
- Single responsibility:
  - Resource: HTTP, input validation, simple business rules.
  - Repository: SQL and persistence concerns.
  - Schema package: DTOs and validation tags used by Huma.
- Adapter usage:
  - Huma + Chi adapter is used to register routes and auto-generate OpenAPI.

## Code Patterns & Conventions

- Schemas are the source of truth. Place request/response types under `internal/database/schema` with Huma/validation tags (enum, minimum, maximum, doc, example).
- Use pointer fields in update DTOs to allow partial updates.
- Validation and OpenAPI metadata live in struct tags — prefer Huma-native tags (e.g., `enum:"..."`, `minimum:"1"`) for better schema generation.
- Avoid custom JSON marshal/unmarshal methods on schema types; Huma needs plain structs to generate OpenAPI properly.
- Error handling:
  - Resources return typed Huma errors (e.g., `huma.Error400BadRequest`, `huma.Error404NotFound`, `huma.Error500InternalServerError`).
  - Log internal errors with context using `log.Printf` before returning 5xx errors.
- DB queries:
  - Repositories accept a small `DB` interface for easier mocking in tests.
  - Use `RETURNING` to fetch created/updated rows.
  - Use `COALESCE` for update statements to preserve existing values when fields are absent.
- Tests:
  - Repository unit tests: use `pgxmock` to assert SQL and return rows.
  - Endpoint tests: use `humatest` and a mock store implementing the resource interface.

## Project Structure (important files)

- `main.go` — app bootstrap and graceful shutdown.
- `routes.go` — router setup and Huma adapter registration.
- `resource/` — HTTP resources and registration (e.g., `resource/account_resource.go`).
- `internal/database/repositories/` — DB repositories (e.g., `account_repository.go`).
- `internal/database/schema/` — DTOs: `account_schema.go`, `account_create_schema.go`, `account_update_schema.go`, `account_search_param_schema.go`, `account_paginated_schema.go`.
- `internal/database/migrations/` — SQL migrations.
- `docs/` — project documentation (this file and `account_service.md`).

## How to Add an Endpoint — Step-by-step

1. Add/Update schema types
   - Create request and response types under `internal/database/schema`.
   - Add Huma validation metadata in struct tags (`doc`, `example`, `enum`, `minimum`, `maximum`, etc.).
   - For updates, use pointer fields so absent fields are distinguished from zero values.
2. Add repository method
   - Implement DB logic in `internal/database/repositories/<repo>.go`.
   - Use the repository's `DB` interface methods: `QueryRow`, `Query`, `Exec`.
   - Return schema DTOs.
3. Add resource handler
   - Define request/response wrapper types in `resource/<name>_resource.go` (embedding path/query/body types).
   - Implement the handler method (context, input pointer) and perform business validation (e.g., require at least one field on update).
   - Use Huma error helpers for consistent HTTP error responses.
4. Register the operation
   - In the resource's `RegisterRoutes` function, call `huma.Register` with a `huma.Operation{OperationID, Method, Path, Summary, Tags}` and the handler method.
5. OpenAPI & router
   - Ensure `routes.go` registers the resource and Huma adapter. Huma will generate `openapi.json` automatically.
   - Avoid CreateHooks that inject `$schema` into responses unless intentionally required.
6. Tests
   - Repository tests: add `pgxmock` tests verifying SQL and mapping to DTOs.
   - Endpoint tests: create a mock store implementing the resource interface and use `humatest.New(t)` to register routes and exercise endpoints.
   - Verify both successful and validation/error paths.
7. Migration (if DB change)
   - Add SQL files under `internal/database/migrations/` (up/down).
   - Follow existing migration formatting and naming conventions.

## Testing Guidance

- Unit tests should be deterministic and isolated from real DB. Use mocks for DB or store interface.
- Endpoint tests should focus on validation, method availability, expected status codes, and basic response shape (use `humatest`).
- Keep tests readable: use table-driven tests for validation and negative cases.

## OpenAPI & Huma Notes

- Huma generates OpenAPI from struct tags and registered operations; keep schema tags accurate.
- Do not attach custom MarshalJSON/UnmarshalJSON methods to schema structs (prevents Huma from observing fields properly).
- For consistent problem responses, rely on Huma's validation and error helpers.

## Conventions & Style

- Function and method names: PascalCase exported, camelCase internal.
- File names: snake_case matching types (e.g., `account_repository.go`, `account_resource.go`).
- Logging: use `log.Printf` for server-side diagnostics; avoid leaking sensitive data.
- Keep resource logic thin — heavy business rules belong in a service layer if they grow.

## Quick Checklist before PR

- Add/adjust schema tags (Huma validation + doc + example).
- Add repository method and unit tests (`pgxmock`).
- Add resource handler + Huma registration and endpoint tests (`humatest`).
- Add migrations (up/down) if altering DB schema.
- Run `go test ./...` and verify OpenAPI generation endpoint (if running server).
