# Writing Tests Guide

A comprehensive guide to writing effective E2E tests for the Spenicle API.

## Test Structure

Every test follows this structure:

```typescript
import { test, expect } from "../../fixtures";

test.describe("Resource API", () => {
  test.describe("POST /resources", () => {
    test("should create resource with valid data", async ({ resourceAPI }) => {
      // 1. Arrange: Set up test data
      const data = {
        name: "Test Resource",
        type: "example" as const,
      };

      // 2. Act: Perform the operation
      const response = await resourceAPI.createResource(data);

      // 3. Assert: Verify the results
      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data?.name).toBe(data.name);

      // 4. Cleanup: Remove test data
      if (response.data?.id) {
        await resourceAPI.deleteResource(response.data.id);
      }
    });

    test("should fail with invalid data", async ({ resourceAPI }) => {
      const invalidData = { name: "" }; // Empty name

      const response = await resourceAPI.createResource(invalidData as any);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error).toBeDefined();
    });
  });
});
```

## Authentication

**Authentication is automatic!** All tests are pre-authenticated via global setup:

```typescript
// ✅ No authentication needed - tokens already loaded
test("should get accounts", async ({ accountAPI }) => {
  const response = await accountAPI.getAccounts();
  expect(response.status).toBe(200);
});

// ❌ Don't do this (outdated pattern):
test.use({ authenticatedContext: {} as any });
```

For testing authentication endpoints specifically, use `authAPI`:

```typescript
test("should fail login with wrong password", async ({ authAPI }) => {
  const response = await authAPI.login("admin", "wrongpassword");
  expect(response.status).toBe(401);
});
```

## Naming Conventions

### Test Suites

```typescript
// ✅ Good: Descriptive, identifies the resource
test.describe("Account API", () => {});
test.describe("Transaction Creation", () => {});

// ❌ Bad: Too vague
test.describe("Tests", () => {});
test.describe("API", () => {});
```

### Test Cases

```typescript
// ✅ Good: Clear action and expected outcome
test("should create account with valid data", async () => {});
test("should return 404 for non-existent account", async () => {});
test("should update account name successfully", async () => {});

// ❌ Bad: Unclear or too generic
test("test account", async () => {});
test("works", async () => {});
test("account test", async () => {});
```

### File Names

```
✅ auth.spec.ts
✅ accounts.spec.ts
✅ transactions.spec.ts
✅ account-budgets.spec.ts

❌ test.ts
❌ api.spec.ts
❌ mytest.spec.ts
```

## Test Patterns

### Happy Path Testing

Test successful operations:

```typescript
test("should create account successfully", async ({ accountAPI }) => {
  const data = {
    name: "Savings Account",
    accountType: "savings",
    currency: "USD",
    amount: 5000,
  };

  const response = await accountAPI.createAccount(data);

  // Verify success
  expect(response.status).toBe(201);
  expect(response.data).toBeDefined();

  // Verify response structure
  expect(response.data?.id).toBeDefined();
  expect(response.data?.name).toBe(data.name);
  expect(response.data?.amount).toBe(data.amount);

  // Verify timestamps
  expect(response.data?.createdAt).toBeDefined();

  // Cleanup
  if (response.data?.id) {
    await accountAPI.deleteAccount(response.data.id);
  }
});
```

### Error Path Testing

Test failure scenarios:

```typescript
test("should fail with empty name", async ({ accountAPI }) => {
  const invalidData = {
    name: "", // Invalid
    accountType: "checking",
    currency: "USD",
    amount: 1000,
  };

  const response = await accountAPI.createAccount(invalidData as any);

  // Verify error
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(response.status).toBeLessThan(500);
  expect(response.error).toBeDefined();

  // Optionally check error details
  expect(response.error?.detail).toBeDefined();
});

test("should return 404 for non-existent resource", async ({ accountAPI }) => {
  const response = await accountAPI.getAccount(
    "00000000-0000-0000-0000-000000000000"
  );

  expect(response.status).toBe(404);
  expect(response.error).toBeDefined();
});

test("should fail without authentication", async ({ request }) => {
  // Make request without auth fixture
  const response = await request.get("/accounts");

  expect(response.status()).toBe(401);
});
```

### Edge Case Testing

Test boundary conditions:

```typescript
test("should handle very long name", async ({ accountAPI }) => {
  const longName = "A".repeat(255);

  const response = await accountAPI.createAccount({
    name: longName,
    accountType: "checking",
    currency: "USD",
    amount: 1000,
  });

  expect(response.status).toBe(201);
  expect(response.data?.name).toBe(longName);

  // Cleanup
  if (response.data?.id) {
    await accountAPI.deleteAccount(response.data.id);
  }
});

test("should handle zero amount", async ({ accountAPI }) => {
  const response = await accountAPI.createAccount({
    name: "Zero Balance",
    accountType: "checking",
    currency: "USD",
    amount: 0,
  });

  expect(response.status).toBe(201);
  expect(response.data?.amount).toBe(0);

  // Cleanup
  if (response.data?.id) {
    await accountAPI.deleteAccount(response.data.id);
  }
});
```

## Resource Management

### Creating Resources

```typescript
test("should create and verify resource", async ({ accountAPI }) => {
  // Create
  const createResponse = await accountAPI.createAccount({
    name: "Test Account",
    accountType: "checking",
    currency: "USD",
    amount: 1000,
  });

  expect(createResponse.status).toBe(201);
  const accountId = createResponse.data!.id;

  // Verify by fetching
  const getResponse = await accountAPI.getAccount(accountId);
  expect(getResponse.status).toBe(200);
  expect(getResponse.data?.id).toBe(accountId);

  // Cleanup
  await accountAPI.deleteAccount(accountId);
});
```

### Updating Resources

```typescript
test("should update resource", async ({ accountAPI }) => {
  // Create
  const createResponse = await accountAPI.createAccount({
    name: "Original Name",
    accountType: "checking",
    currency: "USD",
    amount: 1000,
  });

  const accountId = createResponse.data!.id;

  // Update
  const updateResponse = await accountAPI.updateAccount(accountId, {
    name: "Updated Name",
    amount: 2000,
  });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.data?.name).toBe("Updated Name");
  expect(updateResponse.data?.amount).toBe(2000);

  // Original values should remain
  expect(updateResponse.data?.accountType).toBe("checking");
  expect(updateResponse.data?.currency).toBe("USD");

  // Cleanup
  await accountAPI.deleteAccount(accountId);
});
```

### Deleting Resources

```typescript
test("should delete resource", async ({ accountAPI }) => {
  // Create
  const createResponse = await accountAPI.createAccount({
    name: "To Delete",
    accountType: "checking",
    currency: "USD",
    amount: 1000,
  });

  const accountId = createResponse.data!.id;

  // Delete
  const deleteResponse = await accountAPI.deleteAccount(accountId);
  expect(deleteResponse.status).toBeGreaterThanOrEqual(200);
  expect(deleteResponse.status).toBeLessThan(300);

  // Verify deletion
  const getResponse = await accountAPI.getAccount(accountId);
  expect(getResponse.status).toBe(404);
});
```

## Using Hooks

### beforeAll / afterAll

For test suite setup/teardown:

```typescript
test.describe('Transaction Tests', () => {
  let sharedAccountId: string;
  let sharedCategoryId: string;

  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    // Setup shared resources
    const account = await accountAPI.createAccount({...});
    const category = await categoryAPI.createCategory({...});

    sharedAccountId = account.data!.id;
    sharedCategoryId = category.data!.id;
  });

  test('test 1', async ({ transactionAPI }) => {
    // Use shared resources
    await transactionAPI.createTransaction({
      accountId: sharedAccountId,
      categoryId: sharedCategoryId,
      // ...
    });
  });

  test('test 2', async ({ transactionAPI }) => {
    // Use shared resources
  });

  test.afterAll(async ({ accountAPI, categoryAPI }) => {
    // Cleanup shared resources
    await accountAPI.deleteAccount(sharedAccountId);
    await categoryAPI.deleteCategory(sharedCategoryId);
  });
});
```

### beforeEach / afterEach

For per-test setup/teardown:

```typescript
test.describe("Account Tests", () => {
  let currentAccountId: string;

  test.beforeEach(async ({ accountAPI }) => {
    // Create fresh account for each test
    const response = await accountAPI.createAccount({
      name: "Test Account",
      accountType: "checking",
      currency: "USD",
      amount: 1000,
    });

    currentAccountId = response.data!.id;
  });

  test("test 1", async ({ accountAPI }) => {
    // Use currentAccountId
  });

  test("test 2", async ({ accountAPI }) => {
    // Use currentAccountId (different from test 1)
  });

  test.afterEach(async ({ accountAPI }) => {
    // Cleanup after each test
    await accountAPI.deleteAccount(currentAccountId);
  });
});
```

## Assertions

### Status Codes

```typescript
// Specific status
expect(response.status).toBe(200);
expect(response.status).toBe(201);
expect(response.status).toBe(404);

// Range
expect(response.status).toBeGreaterThanOrEqual(200);
expect(response.status).toBeLessThan(300);

// 4xx errors
expect(response.status).toBeGreaterThanOrEqual(400);
expect(response.status).toBeLessThan(500);
```

### Response Data

```typescript
// Existence
expect(response.data).toBeDefined();
expect(response.data).not.toBeNull();

// Types
expect(typeof response.data?.id).toBe("string");
expect(typeof response.data?.amount).toBe("number");
expect(Array.isArray(response.data?.items)).toBe(true);

// Values
expect(response.data?.name).toBe("Expected Name");
expect(response.data?.amount).toBeGreaterThan(0);
expect(response.data?.items.length).toBe(5);

// Object structure
expect(response.data).toMatchObject({
  name: "Test Account",
  currency: "USD",
});

// Arrays
expect(response.data?.items).toContain(expectedItem);
expect(response.data?.items.length).toBeGreaterThan(0);
```

### Error Responses

```typescript
// Error exists
expect(response.error).toBeDefined();

// Error details
expect(response.error?.detail).toBeDefined();
expect(response.error?.title).toBe("Bad Request");

// Error fields
expect(response.error?.errors).toBeDefined();
expect(response.error?.errors?.length).toBeGreaterThan(0);
```

## Testing Pagination

```typescript
test("should paginate results correctly", async ({ accountAPI }) => {
  // Create multiple accounts
  const promises = [];
  for (let i = 0; i < 15; i++) {
    promises.push(
      accountAPI.createAccount({
        name: `Account ${i}`,
        accountType: "checking",
        currency: "USD",
        amount: 1000 + i,
      })
    );
  }
  const created = await Promise.all(promises);

  // Test first page
  const page1 = await accountAPI.getAccounts({ page: 1, size: 10 });
  expect(page1.status).toBe(200);
  expect(page1.data?.pageNumber).toBe(1);
  expect(page1.data?.pageSize).toBe(10);
  expect(page1.data?.items.length).toBe(10);
  expect(page1.data?.totalPages).toBeGreaterThanOrEqual(2);

  // Test second page
  const page2 = await accountAPI.getAccounts({ page: 2, size: 10 });
  expect(page2.status).toBe(200);
  expect(page2.data?.pageNumber).toBe(2);
  expect(page2.data?.items.length).toBeGreaterThan(0);

  // Verify pages don't overlap
  const page1Ids = page1.data!.items.map((a) => a.id);
  const page2Ids = page2.data!.items.map((a) => a.id);
  const overlap = page1Ids.filter((id) => page2Ids.includes(id));
  expect(overlap.length).toBe(0);

  // Cleanup
  await Promise.all(created.map((r) => accountAPI.deleteAccount(r.data!.id)));
});
```

## Testing Filters

```typescript
test("should filter by search term", async ({ accountAPI }) => {
  // Create accounts with unique names
  const unique = `test-${Date.now()}`;
  await accountAPI.createAccount({
    name: `${unique}-savings`,
    accountType: "savings",
    currency: "USD",
    amount: 1000,
  });

  // Search
  const response = await accountAPI.getAccounts({ search: unique });

  expect(response.status).toBe(200);
  expect(response.data?.items.length).toBeGreaterThan(0);

  // All results should match search
  response.data?.items.forEach((account) => {
    expect(account.name.toLowerCase()).toContain(unique.toLowerCase());
  });
});
```

## Common Pitfalls

### ❌ Not Cleaning Up

```typescript
// Bad: Resources left behind
test('should create account', async ({ accountAPI }) => {
  await accountAPI.createAccount({...});
  // Forgot to delete!
});
```

```typescript
// Good: Always clean up
test('should create account', async ({ accountAPI }) => {
  const response = await accountAPI.createAccount({...});
  expect(response.status).toBe(201);

  await accountAPI.deleteAccount(response.data!.id);
});
```

### ❌ Tests Depending on Each Other

```typescript
// Bad: Test 2 depends on test 1
let accountId: string;

test('test 1', async ({ accountAPI }) => {
  const response = await accountAPI.createAccount({...});
  accountId = response.data!.id; // Shared state!
});

test('test 2', async ({ accountAPI }) => {
  await accountAPI.updateAccount(accountId, {...}); // Fails if test 1 doesn't run
});
```

```typescript
// Good: Each test is independent
test('test 1', async ({ accountAPI }) => {
  const response = await accountAPI.createAccount({...});
  // Use and cleanup
  await accountAPI.deleteAccount(response.data!.id);
});

test('test 2', async ({ accountAPI }) => {
  const response = await accountAPI.createAccount({...});
  // Use and cleanup
  await accountAPI.deleteAccount(response.data!.id);
});
```

### ❌ Not Checking Response Types

```typescript
// Bad: Assumes data exists
test("should get account", async ({ accountAPI }) => {
  const response = await accountAPI.getAccount(id);
  console.log(response.data.name); // Might be undefined!
});
```

```typescript
// Good: Check before using
test("should get account", async ({ accountAPI }) => {
  const response = await accountAPI.getAccount(id);

  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();

  console.log(response.data!.name); // Safe
});
```

## Tips

1. **One assertion per logical concept**: Don't over-assert
2. **Use descriptive variable names**: `accountId` not `id`
3. **Comment complex logic**: Help future maintainers
4. **Test error messages**: Verify user-facing errors are helpful
5. **Use consistent data**: Makes debugging easier
6. **Group related tests**: Use `describe` blocks effectively
7. **Run tests often**: Catch issues early

## Next Steps

- Read [Fixture Architecture](./fixture-architecture.md)
- See example tests in `specs/`
- Check [Playwright docs](https://playwright.dev/docs/api-testing)
