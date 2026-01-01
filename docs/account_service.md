# Account Service

## Overview

This document describes the Account service: its purpose, exposed endpoints, validation rules, data schema, and database behavior.

## Purpose

The Account service manages user accounts (financial ledger entries) with CRUD operations. It exposes HTTP endpoints implemented in resource/account_resource.go and persists data via the repository at internal/database/repositories/account_repository.go.

- Resource implementation: [resource/account_resource.go](../resource/account_resource.go)
- Repository implementation: [internal/database/repositories/account_repository.go](../internal/database/repositories/account_repository.go)
- Schemas (request/response types): [internal/database/schema](internal/database/schema)
- DB migrations: [internal/database/migrations/000001_init.up.sql](internal/database/migrations/000001_init.up.sql)

## Endpoints

All endpoints are registered in `resource/account_resource.go` with Huma operations. Summary below:

- GET /accounts

  - Description: List accounts (paginated) with optional filters.
  - Request: Query parameters documented in `SearchParamAccountSchema` ([internal/database/schema/account_search_param_schema.go](../internal/database/schema/account_search_param_schema.go)).
  - Response: 200 OK with paginated list (`PaginatedAccountSchema`).

- POST /accounts

  - Description: Create a new account.
  - Request body: `CreateAccountSchema` ([internal/database/schema/account_create_schema.go](../internal/database/schema/account_create_schema.go)).
  - Response: 201 Created with created `AccountSchema`.

- GET /accounts/{id}

  - Description: Get account by ID.
  - Path: `id` must be an integer; Huma validates path type and configured minimum (see `AccountPathParam` in resource).
  - Response: 200 OK with `AccountSchema` or 404 Not Found if not present.

- PATCH /accounts/{id}

  - Description: Partial update of account. At least one updatable field must be provided.
  - Request body: `UpdateAccountSchema` ([internal/database/schema/account_update_schema.go](../internal/database/schema/account_update_schema.go)).
  - Response: 200 OK with updated `AccountSchema`.

- DELETE /accounts/{id}
  - Description: Soft-delete an account (sets `deleted_at`).
  - Response: 204 No Content.

## Validation

Validation is handled by Huma using tags on the schema types. Key rules:

- Required fields
  - `CreateAccountSchema` requires `name`, `type`, `note`, and `amount` as defined in the schema file.
- Enums
  - `type` accepts only `income` or `expense` (enum tag on schema fields).
- Numbers
  - `amount` must be a non-negative number (minimum 0).
- Strings
  - `name` has a max length constraint (e.g., 255 characters).
- Query parameters
  - Pagination `pageNumber` and `pageSize` have `minimum` and `maximum` constraints in the schema; defaults may be provided by Huma where applicable.
- Path params
  - `id` path parameter has a `minimum: 1` constraint in the resource (`AccountPathParam`). Huma validates type and minimum.

Behavior notes:

- Huma returns structured problem responses (application/problem+json) for validation errors (422 Unprocessable Entity) and uses the configured Huma error helpers for 400/404/500 responses.
- The resource enforces additional business validation, e.g., `Update` requires at least one field present; otherwise returns 400 Bad Request.

## Data Schema

Primary types live under `internal/database/schema`:

- `AccountSchema` ([internal/database/schema/account_schema.go](../internal/database/schema/account_schema.go)) — canonical representation returned by the API.
- `CreateAccountSchema` ([internal/database/schema/account_create_schema.go](../internal/database/schema/account_create_schema.go)) — request shape for creating accounts.
- `UpdateAccountSchema` ([internal/database/schema/account_update_schema.go](../internal/database/schema/account_update_schema.go)) — request shape for partial updates; fields are pointers to allow partial updates.
- `PaginatedAccountSchema` ([internal/database/schema/account_paginated_schema.go](../internal/database/schema/account_paginated_schema.go)) — response shape for list endpoints.
- `SearchParamAccountSchema` ([internal/database/schema/account_search_param_schema.go](../internal/database/schema/account_search_param_schema.go)) — query parameters for listing/filtering.

Use these types as the source of truth for request/response validation and for generating OpenAPI via Huma.

## Database Related

- The repository `AccountRepository` uses a small DB interface and executes SQL for CRUD operations. See implementation: [internal/database/repositories/account_repository.go](../internal/database/repositories/account_repository.go).
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

- Routes and Huma registrations: [resource/account_resource.go](../../resource/account_resource.go)
- DB repo & SQL: [internal/database/repositories/account_repository.go](../../internal/database/repositories/account_repository.go)
- Schemas: [internal/database/schema](../internal/database/schema)
- Migrations: [internal/database/migrations](../internal/database/migrations)
