# Fixture Architecture

## Overview

The fixture system provides a clean, type-safe way to interact with the API in tests. All types are **automatically generated from OpenAPI spec**, ensuring fixtures stay in sync with the backend.

## Design Principles

1. **Type Safety**: All API methods use OpenAPI-generated types
2. **Reusability**: Common operations extracted into fixtures
3. **Isolation**: Each test gets fresh fixture instances
4. **Global Authentication**: Single login with token persistence (`.auth/user.json`)
5. **Error Handling**: Consistent error response handling
6. **Auto-sync**: Types regenerated before each test run

## Type Generation

Types are automatically generated from `openapi.yaml`:

```bash
# Runs automatically before tests
bun run generate:types

# Manual generation
bun run generate:types
```

This creates `types/openapi.ts` with all schema definitions.

## Fixture Hierarchy

```
BaseAPIClient (reads auth tokens from .auth/user.json)
├── AuthAPIClient (login, refresh)
├── AccountAPIClient (CRUD + archive + reorder)
├── CategoryAPIClient (CRUD + archive + reorder)
└── TransactionAPIClient (CRUD + tags + relations)
```

### BaseAPIClient

Foundation for all API clients, providing:

- **Auto-authentication**: Reads tokens from `.auth/user.json` (set by global-setup.ts)
- HTTP methods (GET, POST, PATCH, PUT, DELETE)
- Authorization header injection
- Response parsing with type safety
- Error handling

**Key Methods:**

```typescript
protected async get<T>(path: string, params?: Record<string, any>): Promise<APIResponse<T>>
protected async post<T>(path: string, body?: any): Promise<APIResponse<T>>
protected async patch<T>(path: string, body?: any): Promise<APIResponse<T>>
protected async delete<T>(path: string): Promise<APIResponse<T>>
```

**Authentication Flow:**

1. `global-setup.ts` runs once before all tests
2. Performs login, saves tokens to `.auth/user.json`
3. All fixtures auto-read tokens from this file
4. No per-test authentication needed

## Creating a New Fixture

To add a new API client:

### 1. Create the Client File

Create `fixtures/your-resource-client.ts`:

```typescript
import { APIRequestContext } from "@playwright/test";
import { BaseAPIClient } from "./base-client";
import type {
  TestContext,
  APIResponse,
  PaginatedResponse,
} from "../types/common";

// Define types based on OpenAPI schema
export interface YourResourceSchema {
  id: string;
  name: string;
  // ... other fields
}

export interface CreateYourResourceSchema {
  name: string;
  // ... required fields
}

export class YourResourceAPIClient extends BaseAPIClient {
  constructor(request: APIRequestContext, context: TestContext) {
    super(request, context);
  }

  /**
   * Get all resources
   */
  async getResources(params?: {
    page?: number;
    size?: number;
  }): Promise<APIResponse<PaginatedResponse<YourResourceSchema>>> {
    return this.get<PaginatedResponse<YourResourceSchema>>(
      "/your-resources",
      params
    );
  }

  /**
   * Get single resource
   */
  async getResource(id: string): Promise<APIResponse<YourResourceSchema>> {
    return this.get<YourResourceSchema>(`/your-resources/${id}`);
  }

  /**
   * Create resource
   */
  async createResource(
    data: CreateYourResourceSchema
  ): Promise<APIResponse<YourResourceSchema>> {
    return this.post<YourResourceSchema>("/your-resources", data);
  }

  // ... other methods
}
```

### 2. Add to Fixture Index

Update `fixtures/index.ts`:

```typescript
import { YourResourceAPIClient } from "./your-resource-client";

type APIFixtures = {
  // ... existing fixtures
  yourResourceAPI: YourResourceAPIClient;
};

export const test = base.extend<APIFixtures>({
  // ... existing fixtures

  yourResourceAPI: async ({ request, testContext }, use) => {
    const client = new YourResourceAPIClient(request, testContext);
    await use(client);
  },
});
```

### 3. Use in Tests

```typescript
import { test, expect } from "../../fixtures";

test("should use new fixture", async ({ yourResourceAPI }) => {
  const response = await yourResourceAPI.getResources();
  expect(response.status).toBe(200);
});
```

## Authentication Flow

### Without Authentication

```typescript
test("should work without auth", async ({ accountAPI }) => {
  // This will fail with 401 if endpoint requires auth
  const response = await accountAPI.getAccounts();
});
```

### With Manual Authentication

```typescript
test("should work with manual auth", async ({ authAPI, accountAPI }) => {
  // Login first
  await authAPI.login("username", "password");

  // Now authenticated
  const response = await accountAPI.getAccounts();
  expect(response.status).toBe(200);
});
```

### With Automatic Authentication

```typescript
test.use({ authenticatedContext: {} as any });

test("should work with auto auth", async ({ accountAPI }) => {
  // Already authenticated!
  const response = await accountAPI.getAccounts();
  expect(response.status).toBe(200);
});
```

## Response Handling

All API methods return an `APIResponse<T>` object:

```typescript
interface APIResponse<T> {
  data?: T; // Response body if successful
  error?: ErrorModel; // Error details if failed
  status: number; // HTTP status code
  headers: Record<string, string>; // Response headers
}
```

### Checking Success

```typescript
const response = await accountAPI.getAccount(id);

if (response.status >= 200 && response.status < 300) {
  // Success
  console.log(response.data);
} else {
  // Error
  console.log(response.error);
}
```

### Using Assertions

```typescript
const response = await accountAPI.createAccount(data);

// Assert success
expect(response.status).toBe(201);
expect(response.data).toBeDefined();
expect(response.data?.id).toBeDefined();

// Or for errors
expect(response.status).toBeGreaterThanOrEqual(400);
expect(response.error).toBeDefined();
```

## Advanced Patterns

### Setup/Teardown with Fixtures

```typescript
test.describe('Complex Tests', () => {
  let setupData: {
    accountId: string;
    categoryId: string;
  };

  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    const account = await accountAPI.createAccount({...});
    const category = await categoryAPI.createCategory({...});

    setupData = {
      accountId: account.data!.id,
      categoryId: category.data!.id,
    };
  });

  test('should use setup data', async ({ transactionAPI }) => {
    const response = await transactionAPI.createTransaction({
      accountId: setupData.accountId,
      categoryId: setupData.categoryId,
      // ...
    });
  });

  test.afterAll(async ({ accountAPI, categoryAPI }) => {
    await accountAPI.deleteAccount(setupData.accountId);
    await categoryAPI.deleteCategory(setupData.categoryId);
  });
});
```

### Custom Fixtures

Create domain-specific fixtures for complex scenarios:

```typescript
// fixtures/custom-fixtures.ts
export const testWithSetup = base.extend<{
  fullTransactionSetup: {
    account: AccountSchema;
    category: CategorySchema;
    transaction: TransactionSchema;
  };
}>({
  fullTransactionSetup: async ({ accountAPI, categoryAPI, transactionAPI }, use) => {
    // Setup
    const account = await accountAPI.createAccount({...});
    const category = await categoryAPI.createCategory({...});
    const transaction = await transactionAPI.createTransaction({...});

    await use({
      account: account.data!,
      category: category.data!,
      transaction: transaction.data!,
    });

    // Teardown
    await transactionAPI.deleteTransaction(transaction.data!.id);
    await accountAPI.deleteAccount(account.data!.id);
    await categoryAPI.deleteAccount(category.data!.id);
  },
});

// In test
testWithSetup('should use full setup', async ({ fullTransactionSetup }) => {
  // Use pre-created resources
  console.log(fullTransactionSetup.account.id);
});
```

## Best Practices

1. **Keep clients focused**: One client per resource
2. **Type everything**: Use TypeScript types from OpenAPI
3. **Handle errors gracefully**: Always check status codes
4. **Clean up resources**: Use afterEach/afterAll hooks
5. **Use descriptive names**: Method names should be clear
6. **Document methods**: Add JSDoc comments
7. **Test fixtures**: Write unit tests for complex fixtures

## Testing Fixtures

While fixtures are tested through integration tests, you can also test them directly:

```typescript
test("fixture should handle errors correctly", async ({
  request,
  testContext,
}) => {
  const client = new AccountAPIClient(request, testContext);

  const response = await client.getAccount("invalid-id");

  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.error).toBeDefined();
});
```
