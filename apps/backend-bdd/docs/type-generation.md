# Type Generation from OpenAPI

## Overview

All TypeScript types are **automatically generated** from the backend's OpenAPI specification. This ensures perfect sync between backend schemas and frontend types.

## How It Works

### 1. Backend Updates OpenAPI Spec

When backend schemas change in `apps/backend/internal/database/schemas/`, the OpenAPI spec at `openapi.yaml` is regenerated:

```bash
cd apps/backend
go run cmd/app/main.go  # Regenerates openapi.yaml
```

### 2. Generate TypeScript Types

From `apps/backend-bdd`:

```bash
bun run generate:types
```

This runs `scripts/generate-openapi-types.ts`, which:

- Reads `/openapi.yaml` from repository root
- Uses `openapi-typescript` to generate types
- Outputs to `types/openapi.ts`

**Automatic execution**: Types are regenerated before every test run via `pretest` script in `package.json`.

### 3. Use Types in Fixtures

Import from `types/openapi`:

```typescript
import type { components } from "../types/openapi";

// Extract schema types
type AccountSchema = components["schemas"]["AccountSchema"];
type CreateAccountSchema = components["schemas"]["CreateAccountSchema"];
type PaginatedAccountSchema = components["schemas"]["PaginatedAccountSchema"];

// Use in fixture methods
async createAccount(
  data: CreateAccountSchema
): Promise<APIResponse<AccountSchema>> {
  return this.post<AccountSchema>("/accounts", data);
}
```

## Type Structure

Generated `types/openapi.ts` contains:

### `components['schemas']`

All backend schemas:

```typescript
components["schemas"]["AccountSchema"];
components["schemas"]["CreateAccountSchema"];
components["schemas"]["UpdateAccountSchema"];
components["schemas"]["PaginatedAccountSchema"];
// ... all other schemas
```

### `operations`

All API operations with request/response types:

```typescript
operations["create-account"]["requestBody"]["content"]["application/json"];
operations["create-account"]["responses"]["201"]["content"]["application/json"];
```

## Benefits

1. **Zero Drift**: Types always match backend exactly
2. **Compile-Time Safety**: TypeScript catches schema mismatches
3. **IDE Autocomplete**: Full IntelliSense for all fields
4. **Refactoring**: Rename fields in backend → TypeScript errors guide updates
5. **Documentation**: Types serve as inline documentation

## Example: Account Fixture

```typescript
import type { components } from "../types/openapi";

// Extract types
type AccountSchema = components["schemas"]["AccountSchema"];
type CreateAccountSchema = components["schemas"]["CreateAccountSchema"];
type UpdateAccountSchema = components["schemas"]["UpdateAccountSchema"];

export class AccountAPIClient extends BaseAPIClient {
  async createAccount(
    data: CreateAccountSchema // Type-safe input
  ): Promise<APIResponse<AccountSchema>> {
    // Type-safe output
    return this.post<AccountSchema>("/accounts", data);
  }

  async updateAccount(
    id: number,
    data: UpdateAccountSchema // Partial update schema
  ): Promise<APIResponse<AccountSchema>> {
    return this.patch<AccountSchema>(`/accounts/${id}`, data);
  }
}
```

## Workflow

### Normal Development

1. Make backend schema changes in `apps/backend/`
2. Rebuild backend (regenerates openapi.yaml)
3. Run tests: `bun run test`
   - Types auto-regenerate via `pretest` hook
   - TypeScript errors if schemas changed
   - Update fixtures to match new schemas

### Manual Regeneration

```bash
cd apps/backend-bdd

# Generate types only
bun run generate:types

# Check what changed
git diff types/openapi.ts
```

## Schema vs Type Names

Backend schemas use Go naming:

```go
// apps/backend/internal/database/schemas/account_schema.go
type AccountSchema struct {
    ID        int64  `json:"id"`
    Name      string `json:"name"`
    Type      string `json:"type"`  // not accountType!
    Amount    int64  `json:"amount"` // integers, not floats
}
```

Generated TypeScript follows exactly:

```typescript
components["schemas"]["AccountSchema"] = {
  id: number;
  name: string;
  type: string;      // matches Go: "type"
  amount: number;    // matches Go: integer
};
```

## Common Patterns

### Enums

```typescript
// From OpenAPI enum
type AccountType = components["schemas"]["AccountSchema"]["type"];
// "income" | "expense" | "investment"

const account: CreateAccountSchema = {
  name: "Savings",
  type: "income" as const, // Type-safe enum
  amount: 1000,
};
```

### Nullable Fields

```typescript
type UpdateAccountSchema = components["schemas"]["UpdateAccountSchema"];
// archivedAt?: string | null

await accountAPI.updateAccount(id, {
  archivedAt: null, // Unarchive
});
```

### Required vs Optional

Backend schema validation determines required fields:

```go
type CreateAccountSchema struct {
    Name   string `json:"name" validate:"required"`
    Type   string `json:"type" validate:"required"`
    Amount int64  `json:"amount" validate:"required"`
    Note   string `json:"note,omitempty"`  // optional
}
```

Generated TypeScript reflects this:

```typescript
type CreateAccountSchema = {
  name: string; // required
  type: string; // required
  amount: number; // required
  note?: string; // optional
};
```

## Troubleshooting

### Types Out of Sync

**Symptom**: TypeScript errors about missing/wrong fields

**Fix**:

```bash
cd apps/backend
go run cmd/app/main.go  # Regenerate openapi.yaml

cd ../backend-bdd
bun run generate:types  # Regenerate TypeScript types
```

### Generation Fails

**Symptom**: `generate:types` script errors

**Cause**: Invalid OpenAPI spec

**Fix**: Check backend OpenAPI generation, validate `openapi.yaml`

### Wrong Port in Tests

**Symptom**: Tests fail with connection errors

**Fix**: Ensure `.env` has `APP_PORT=8080` matching docker-compose.yml
