# Account Service

## Overview

This document describes the Account service: its purpose, exposed endpoints, validation rules, data schema, and architecture.

## Purpose

The Account service manages user accounts (financial ledger entries) with CRUD operations. It follows a three-layer architecture:

- **Resource Layer** - HTTP handlers at [internal/resources/account_resource.go](../internal/resources/account_resource.go)
- **Service Layer** - Business logic at [internal/services/account_service.go](../internal/services/account_service.go)
- **Repository Layer** - Data access at [internal/repositories/account_repository.go](../internal/repositories/account_repository.go)

### Architecture Flow

```
HTTP Request → Resource → Service → Repository → Database
                  ↓          ↓          ↓
              HTTP layer  Business  Data layer
```

**Additional References:**

- Schemas (request/response types): [internal/database/schemas/](../internal/database/schemas/)
- DB migrations: [internal/database/migrations/](../internal/database/migrations/)
- Testing standards: [testing_standards.md](testing_standards.md)

## Endpoints

All endpoints are registered in `resource/account_resource.go` with Huma operations. **All endpoints require JWT authentication** via `Authorization: Bearer <token>` header.

- GET /accounts

  - Description: List accounts (paginated) with optional filters.
  - Request: Query parameters documented in `SearchParamAccountSchema` ([internal/database/schema/account_search_param_schema.go](../internal/database/schema/account_search_param_schema.go)).
  - Response: 200 OK with paginated list (`PaginatedAccountSchema`).
  - Auth: Required

- POST /accounts

  - Description: Create a new account.
  - Request body: `CreateAccountSchema` ([internal/database/schema/account_create_schema.go](../internal/database/schema/account_create_schema.go)).
  - Response: 201 Created with created `AccountSchema`.
  - Auth: Required

- GET /accounts/{id}

  - Description: Get account by ID.
  - Path: `id` must be an integer; Huma validates path type and configured minimum (see `AccountPathParam` in resource).
  - Response: 200 OK with `AccountSchema` or 404 Not Found if not present.
  - Auth: Required

- PATCH /accounts/{id}

  - Description: Partial update of account. At least one updatable field must be provided.
  - Request body: `UpdateAccountSchema` ([internal/database/schema/account_update_schema.go](../internal/database/schema/account_update_schema.go)).
  - Response: 200 OK with updated `AccountSchema`.
  - Auth: Required

- DELETE /accounts/{id}
  - Description: Soft-delete an account (sets `deleted_at`).
  - Response: 204 No Content.
  - Auth: Required

## Authentication

To access account endpoints:

1. Login via `POST /auth/login` with credentials from `.env`:
   ```json
   {
     "username": "your-admin-username",
     "password": "your-admin-password"
   }
   ```
2. Receive JWT token valid for 1 week
3. Include token in requests: `Authorization: Bearer <token>`
4. Token validation happens in middleware before reaching resources

## Validation

Validation occurs at two levels:

### Schema Validation (Data-Level)

Handled automatically by Huma using struct tags on schema types. Enforces:

- **Required fields** - `CreateAccountSchema` requires `name`, `type`, `note`, and `amount`
- **Enums** - `type` accepts only `income` or `expense`
- **Number constraints** - `amount` must be non-negative (minimum: 0)
- **String constraints** - `name` max length (255 characters)
- **Query parameters** - Pagination constraints on `pageNumber` and `pageSize`
- **Path parameters** - `id` must be ≥ 1

Schema validation returns **422 Unprocessable Entity** for violations.

### Business Validation (Service-Level)

Handled by the service layer for domain rules:

- **Update requires fields** - At least one field must be provided for partial updates
  - Returns `ErrNoFieldsToUpdate` → **400 Bad Request**
- **Entity existence** - Account must exist for Get/Update/Delete operations

  - Returns `ErrAccountNotFound` → \*\*404 Not Founds`:

- `AccountSchema` ([account_schema.go](../internal/database/schemas/account_schema.go)) — canonical representation returned by the API.
- `CreateAccountSchema` ([account_create_schema.go](../internal/database/schemas/account_create_schema.go)) — request shape for creating accounts.
- `UpdateAccountSchema` ([account_update_schema.go](../internal/database/schemas/account_update_schema.go)) — request shape for partial updates; fields are pointers to allow partial updates.
- `PaginatedAccountSchema` ([account_paginated_schema.go](../internal/database/schemas/account_paginated_schema.go)) — response shape for list endpoints.
- `SearchParamAccountSchema` ([account_search_param_schema.go](../internal/database/schemas/account_search_param_schema.go)) — query parameters for listing/filtering.

Use these types as the source of truth for request/response validation and for generating OpenAPI via Huma.

## Service Layer

The service layer ([account_service.go](../internal/services/account_service.go)) sits between resources and repositories:

**Responsibilities:**

- Business-level validation (cross-field rules, domain constraints, input sanitization)
- Business rules enforcement
- Domain logic implementation
- Consume and propagate domain errors from repository

**Domain Errors (defined in `repositories` package):**

```go
var (
    ErrAccountNotFound    = errors.New("account not found")
    ErrNoFieldsToUpdate   = errors.New("at least one field must be provided to update")
    ErrInvalidAccountData = errors.New("invalid account data")
)
```

**Error Handling Pattern:**

- Repository returns `repositories.ErrAccountNotFound` directly (not `pgx.ErrNoRows`)
- Service validates business rules and returns `repositories.ErrNoFieldsToUpdate` when applicable
- Service wraps unexpected errors with context for debugging
- Resource layer translates domain errors to HTTP status codes

The service layer uses an `AccountStore` interface for testability, allowing repository mocking in tests
Huma returns structured problem responses (application/problem+json):

- **422** - Schema validation failures
- **401** - Unauthorized (missing or invalid JWT token)
- **400** - Business rule violations (no fields provided)
- **404** - Entity not found
- **500** - Internal server errors

## Data Schema

Primary types live under `internal/database/schema`:

- `AccountSchema` ([internal/database/schema/account_schema.go](../internal/database/schema/account_schema.go)) — canonical representation returned by the API.
- `CreateAccountSchema` ([internal/database/schema/account_create_schema.go](../internal/database/schema/account_create_schema.go)) — request shape for creating accounts.
- `UpdateAccountSchema` ([internal/database/schema/account_update_schema.go](../internal/database/schema/account_update_schema.go)) — request shape for partial updates; fields are pointers to allow partial updates.
- `PaginatedAccountSchema` ([internal/database/schema/account_paginated_schema.go](../internal/database/schema/account_paginated_schema.go)) — response shape for list endpoints.
- `SearchParamAccountSchema` ([internal/database/schema/account_search_param_schema.go](../internal/database/schema/account_search_param_schema.go)) — query parameters for listing/filtering.

Use these types as the source of truth for request/response validation and for generating OpenAPI via Huma.

## Database Related

- The repository `AccountRepository` uses a small DB interface and executes SQL for CRUD operations. See implementation: [internal/repositories/account_repository.go](../internal/repositories/account_repository.go).
- Creation returns the inserted row (RETURNING id, created_at, etc.).
- Update uses `COALESCE` to preserve existing values where `NULL`/absent values are provided.
- Delete performs a soft delete by setting `deleted_at` to CURRENT_TIMESTAMP; the row remains in the database.

Migrations:

- Initial migration: [internal/database/migrations/000001_init.up.sql](../internal/database/migrations/000001_init.up.sql)
- Down migration: [internal/database/migrations/000001_init.down.sql](../internal/database/migrations/000001_init.down.sql)

## Examples

- Create request body (JSON):

```json
{
  "name": "Cash",
  "type": "income",
  "note": "Main wallet",
  "amount": 1000
}
```

- Typical responses:
  - 201 Created with the created account object.
  - 422 Unprocessable Entity with validation errors for invalid input.
  - 400 Bad Request for application-level rejections (e.g., empty update payload).
  - 404 Not Found when requesting a non-existent resource.

## Where to look in code

- Routes and Huma registrations: [internal/resources/account_resource.go](../../intenral/resources/account_resource.go)
- DB repo & SQL: [internal/repositories/account_repository.go](../../internal/repositories/account_repository.go)
- Schemas: [internal/database/schema](../internal/database/schema)
- Migrations: [internal/database/migrations](../internal/database/migrations)
