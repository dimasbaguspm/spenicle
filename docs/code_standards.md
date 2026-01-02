# Code Standards — Account API

## Overview

This document describes the code patterns, design choices, file structure, and a step-by-step recipe for adding an endpoint in this codebase.

## Design Pattern

- Resource + Service + Repository pattern:
  - `internal/resources/*` implements HTTP handlers (Huma operations), handles HTTP concerns, and translates service errors to HTTP status codes.
  - `internal/services/*` implements business logic, business-level validation, and domain rules. Services use a store interface (e.g., `AccountStore`) to interact with repositories.
  - `internal/repositories/*` implements DB access (SQL) and returns schema DTOs.
- Single responsibility:
  - Resource: HTTP protocol, request/response mapping, HTTP status codes.
  - Service: Business validation, domain rules, error translation from DB to domain errors.
  - Repository: SQL queries, row scanning, database-specific concerns.
  - Schema package: DTOs with Huma validation tags for data-level constraints.
- Validation layers:
  - **Schema validation** (data-level): Individual field constraints via struct tags (minLength, enum, minimum, etc.). Enforces data integrity and format.
  - **Service validation** (business-level): Cross-field rules, domain invariants, business constraints (e.g., "at least one field for update", "unique name per user", "savings accounts need minimum balance").
- Adapter usage:
  - Huma + Chi adapter is used to register routes and auto-generate OpenAPI.
- Architecture flow:
  ```
  HTTP Request → Resource → Service → Repository → Database
                    ↓          ↓          ↓
                HTTP layer  Business  Data layer
  ```

## Observability

- **Structured Logging**: Use `logger.Log()` from `internal/observability/logger` for JSON-formatted logs.
- **Tracing**: OpenTelemetry tracing initialized in handlers.go (currently stdout exporter for development).
- **Health Checks**:
  - `/health` - Overall health with database check
  - `/health/ready` - Kubernetes readiness probe
  - `/health/live` - Kubernetes liveness probe

## Middleware

- **Recovery**: Catches panics and logs stack traces.
- **Request Logging**: Logs all HTTP requests with duration, status code, and request ID.
- **Authentication**: JWT-based authentication using `internal/middleware/auth.go`.
  - Login endpoint: `POST /auth/login` (username/password from .env)
  - Returns JWT token valid for 1 week
  - Protected routes require `Authorization: Bearer <token>` header

## Authentication

- Single admin user configured via environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`).
- JWT tokens signed with `JWT_SECRET` from environment.
- Token expiration: 1 week (168 hours).
- All `/accounts` endpoints require authentication.
- Login endpoint (`/auth/login`) is public.

## Code Patterns & Conventions

- Schemas are the source of truth. Place request/response types under `internal/database/schema` with Huma/validation tags (enum, minimum, maximum, doc, example).
- Use pointer fields in update DTOs to allow partial updates.
- Validation and OpenAPI metadata live in struct tags — prefer Huma-native tags (e.g., `enum:"..."`, `minimum:"1"`) for better schema generation.
- Avoid custom JSON marshal/unmarshal methods on schema types; Huma needs plain structs to generate OpenAPI properly.
- Error handling:
  - Resources return typed Huma errors (e.g., `huma.Error400BadRequest`, `huma.Error404NotFound`, `huma.Error500InternalServerError`).
  - Use structured logging with `logger.Log()` for diagnostics; avoid leaking sensitive data.
- DB queries:
  - Repositories accept a small `DB` interface for easier mocking in tests.
  - Use `RETURNING` to fetch created/updated rows.
  - Use `COALESCE` for update statements to preserve existing values when fields are absent.
- Tests:
  - Repository unit tests: use `pgxmock` to assert SQL and return rows.
  - Service unit tests: use function-based mocks to test business logic and validation.
  - Resource tests: use `humatest` and a mock service implementing the resource interface.
  - See [testing_standards.md](testing_standards.md) for comprehensive testing guidelines.

## Project Structure (important files)

- `main.go` — app bootstrap and graceful shutdown.
- `handlers.go` — router setup, Huma adapter registration, and dependency wiring.
- `internal/resources/` — HTTP resources and route registration (e.g., `account_resource.go`, `auth_resource.go`).
- `internal/services/` — Business logic and domain rules (e.g., `account_service.go`).
- `internal/repositories/` — DB repositories (e.g., `account_repository.go`).
- `internal/middleware/` — HTTP middleware (auth, logging, recovery).
- `internal/observability/` — Logging and tracing utilities.
- `internal/health/` — Health check endpoints for monitoring and orchestration.
- `internal/database/schemas/` — DTOs with validation tags: `account_schema.go`, `account_create_schema.go`, `account_update_schema.go`, etc.
- `internal/database/migrations/` — SQL migrations (up/down).
- `docs/` — project documentation (this file, `account_service.md`, and `testing_standards.md`).

## How to Add an Endpoint — Step-by-step

1. Add/Update schema types
   - Define request/response DTOs in `internal/database/schemas/`.
   - Add Huma validation metadata in struct tags for **data-level constraints** (`doc`, `example`, `enum`, `minimum`, `maximum`, `minLength`, `maxLength`).
   - For updates, use pointer fields so absent fields are distinguished from zero values.
2. Add repository method
   - Implement DB logic in `internal/repositories/<repo>.go`.
   - Use the repository's `DB` interface methods: `QueryRow`, `Query`, `Exec`.
   - Return schema DTOs and wrap errors with context (e.g., `fmt.Errorf("get account: %w", err)`).
3. Add service method
   - Implement business logic in `internal/services/<name>_service.go`.
   - Add **business-level validation** (cross-field rules, domain constraints).
   - Translate repository errors to domain errors (e.g., `pgx.ErrNoRows` → `ErrAccountNotFound`).
   - Define domain errors as package-level variables (e.g., `var ErrAccountNotFound = errors.New("account not found")`).
4. Add resource handler
   - Define request/response wrapper types in `internal/resources/<name>_resource.go` (embedding path/query/body types).
   - Implement the handler method (context, input pointer) calling the service layer.
   - Translate domain errors to HTTP errors using `errors.Is()` checks (e.g., `ErrAccountNotFound` → `huma.Error404NotFound`).
   - Use Huma error helpers for consistent HTTP error responses.
5. Register the operation
   - In the resource's `RegisterRoutes` function, call `huma.Register` with a `huma.Operation{OperationID, Method, Path, Summary, Tags}` and the handler method.
6. Wire dependencies
   - In `handlers.go`, wire Repository → Service → Resource:
     ```go
     repo := repositories.NewAccountRepository(pool)
     service := services.NewAccountService(repo)
     resource := resources.NewAccountResource(service)
     resource.RegisterRoutes(humaApi)
     ```
7. Tests
   - Repository tests: add `pgxmock` tests verifying SQL and mapping to DTOs.
   - Service tests: create a mock store and test business logic, error translation, and validation rules.
   - Resource tests: create a mock service and use `humatest.New(t)` to register routes and exercise endpoints. Test HTTP status codes and error responses.
   - Verify both successful and validation/error paths for all layers.
   - See [testing_standards.md](testing_standards.md) for detailed patterns.
8. Migration (if DB change)
   - Add SQL files under `internal/database/migrations/` (up/down).
   - Follow existing migration formatting and naming conventions.

## Testing Guidance

- Unit tests should be dedicated to each layer following separation of concerns.
- **Repository tests**: Use `pgxmock` to assert SQL queries and test row scanning. Test error cases (e.g., connection errors, constraint violations).
- **Service tests**: Mock the store interface and test business logic, validation rules, and error translation (e.g., `pgx.ErrNoRows` → domain errors).
- **Resource tests**: Mock the service and use `humatest` to test HTTP concerns (status codes, error responses, request/response mapping).
- Keep tests readable: use table-driven tests for validation and negative cases.
- Test naming: `Test<MethodName>_<Scenario>` (e.g., `TestUpdate_NoFieldsProvided`, `TestGet_AccountNotFound`)
- For comprehensive testing patterns and examples, see [testing_standards.md](testing_standards.md).

## OpenAPI Considerations

- Huma generates OpenAPI from struct tags and registered operations; keep schema tags accurate.
- Do not attach custom MarshalJSON/UnmarshalJSON methods to schema structs (prevents Huma from observing fields properly).
- For consistent problem responses, rely on Huma's validation and error helpers.

## Conventions & Style

- Function and method names: PascalCase exported, camelCase internal.
- File names: snake_case matching types (e.g., `account_repository.go`, `account_resource.go`).
- Logging: use structured logging via `logger.Log()` from `internal/observability/logger`; avoid leaking sensitive data.
- Keep resource logic thin — heavy business rules belong in a service layer.

## Quick Checklist before PR

- Add/adjust schema tags for **data-level validation** (Huma validation + doc + example).
- Add repository method and unit tests (`pgxmock`).
- Add service method with **business-level validation** and unit tests (mocked store).
- Add resource handler with error translation and endpoint tests (`humatest` with mocked service).
- Wire dependencies in `handlers.go` (Repository → Service → Resource).
- Add authentication if endpoint needs protection (pass `authMiddleware` to `RegisterRoutes`).
- Add migrations (up/down) if altering DB schema.
- Run `go test ./...` and ensure all tests pass.

## Environment Variables

Required environment variables in `.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/dbname
APP_PORT=8080
JWT_SECRET=your-secret-key-change-this-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
```
