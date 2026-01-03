# Code Standards — Account API

This file captures the essential architecture and development conventions for the project. For examples and test patterns, see the other docs in this folder.

Key principles

- Architecture: Resource → Service → Repository. Keep responsibilities separated:
  - `resources`: HTTP concerns, Huma operations, error → HTTP translation.
  - `services`: business validation, sanitization, domain rules.
  - `repositories`: DB access and mapping to schema DTOs (no business validation).
- Validation: use Huma/schema tags for data-level checks; enforce cross-field and business rules in services.
- Schemas: keep DTOs in `internal/database/schemas/`. Use pointer fields for update DTOs to allow partial updates.

Observability & middleware

- Use `internal/observability/logger` for structured logs and follow tracing setup (OpenTelemetry).
- Standard middleware (Chi): recovery, request logging, request ID, real IP, and heartbeat endpoints (`/health`, `/health/ready`, `/health/live`).

Authentication

- JWT-based patterns. Public routes include `/auth/login`, `/auth/refresh`, `/docs`, `/health`. Protect `/accounts` endpoints; see `authentication_guide.md`.

DB & queries

- Repositories accept a small `DB` interface (QueryRow/Query/Exec) for easier testing with `pgxmock`.
- Use `RETURNING` for create/update and `COALESCE` for optional update fields.

Sanitization

- Sanitize user text inputs in the service layer using `internal/services/sanitize.go` (trim, strip HTML, normalize entities, collapse spaces). Do not sanitize enums, numeric types, or timestamps.

Testing

- Repository tests: `pgxmock`.
- Service tests: mock store interfaces and validate business rules and error translation.
- Resource tests: `humatest` with mocked services.
- Run tests with `go test ./... -v`.

Quick checklist before PR

- Update schema tags for data-level validation.
- Add repository method + `pgxmock` tests.
- Add service method + unit tests (mock store).
- Add resource handler + `humatest` endpoint tests.
- Wire dependencies in `handlers.go` and add migrations when schema changes.

References

- See `authentication_guide.md`, `testing_standards.md`, and `performance.md` for deeper guidance.

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

## Input Sanitization

All user-provided string inputs must be sanitized at the **service layer** to prevent XSS attacks and normalize data.

**Sanitization utilities** are provided in `internal/services/sanitize.go`:

- `SanitizeString(input string) string` - Sanitizes regular strings
- `SanitizeStringPtr(input *string) *string` - Sanitizes pointer strings (for updates)

**What sanitization does:**

1. Trims leading/trailing whitespace
2. Removes all HTML tags (e.g., `<script>`, `<img>`)
3. Normalizes HTML entities (escape dangerous characters)
4. Collapses multiple spaces into single space

**When to sanitize:**

- All text inputs from users (names, notes, descriptions)
- Apply in service layer before calling repository
- Apply for both Create and Update operations

**Example usage:**

```go
func (s *AccountService) Create(ctx context.Context, data schemas.CreateAccountSchema) (schemas.AccountSchema, error) {
    // Sanitize string inputs
    data.Name = SanitizeString(data.Name)
    data.Note = SanitizeString(data.Note)

    // Validate after sanitization
    if data.Name == "" {
        return schemas.AccountSchema{}, errors.New("name cannot be empty after sanitization")
    }

    return s.store.Create(ctx, data)
}

func (s *AccountService) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
    // Sanitize pointer fields
    data.Name = SanitizeStringPtr(data.Name)
    data.Note = SanitizeStringPtr(data.Note)

    // Validate after sanitization (if provided)
    if data.Name != nil && *data.Name == "" {
        return schemas.AccountSchema{}, errors.New("name cannot be empty")
    }

    return s.store.Update(ctx, id, data)
}
```

**What NOT to sanitize:**

- Enum values (already validated by schema tags)
- Numeric values (type-safe)
- Timestamps (system-generated)
- Email addresses (use specific email validation instead)

**Security note:** Sanitization is a defense-in-depth measure. Always rely on schema validation tags as the first line of defense (`minLength`, `maxLength`, `enum`, etc.).

## Quick Checklist before PR

- Add/adjust schema tags for **data-level validation** (Huma validation + doc + example).
- Add repository method and unit tests (`pgxmock`).
- Add service method with **business-level validation** and unit tests (mocked store).
- Add resource handler with error translation and endpoint tests (`humatest` with mocked service).
- Wire dependencies in `handlers.go` (Repository → Service → Resource).
- Add authentication if endpoint needs protection - see [authentication_guide.md](authentication_guide.md) for public vs protected route patterns.
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
