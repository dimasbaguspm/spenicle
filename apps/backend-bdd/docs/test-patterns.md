# Test Patterns and Organization

This document describes the test organization patterns, structures, and conventions used in the E2E test suite.

## Table of Contents

- [Test Organization](#test-organization)
- [Test Categories](#test-categories)
- [Test Structure (AAA Pattern)](#test-structure-aaa-pattern)
- [Naming Conventions](#naming-conventions)
- [Examples by Category](#examples-by-category)
- [Best Practices](#best-practices)

## Test Organization

Tests are organized by **domain/feature** in a hierarchical folder structure:

```
specs/
├── accounts/
│   └── accounts.spec.ts              # CRUD operations
├── auth/
│   └── auth.spec.ts                  # Authentication flows
├── categories/
│   └── categories.spec.ts            # CRUD operations
└── transactions/
    ├── transactions.spec.ts          # CRUD operations (Common)
    ├── type-conversions.spec.ts      # Business requirements
    ├── balance-consistency.spec.ts   # Business requirements
    ├── advanced-filtering.spec.ts    # Advanced features
    └── relations-edge-cases.spec.ts  # Edge cases
```

### Naming Conventions

- **CRUD files**: Named after the resource (e.g., `accounts.spec.ts`, `categories.spec.ts`)
- **Business logic files**: Named after the feature or requirement (e.g., `type-conversions.spec.ts`, `balance-consistency.spec.ts`)
- **Advanced features**: Prefixed with feature name (e.g., `advanced-filtering.spec.ts`)
- **Edge cases**: Suffixed with `-edge-cases` (e.g., `relations-edge-cases.spec.ts`)

## Test Categories

### 1. **Common (CRUD) Tests**

Basic Create, Read, Update, Delete operations for resources. These tests validate:

- ✅ Resource creation with valid data
- ✅ Resource retrieval (list and single)
- ✅ Resource updates
- ✅ Resource deletion
- ✅ Basic validation errors
- ✅ Pagination and search
- ✅ Authentication requirements

**Examples:**

- [accounts.spec.ts](../specs/accounts/accounts.spec.ts)
- [categories.spec.ts](../specs/categories/categories.spec.ts)
- [transactions.spec.ts](../specs/transactions/transactions.spec.ts)

**Characteristics:**

- Straightforward HTTP operations
- Simple validation checks
- No complex business logic
- Independent test cases
- Fast execution

### 2. **Business Requirements Tests**

Tests that validate complex business rules and domain logic. These tests ensure:

- ✅ Business rules are enforced
- ✅ Domain constraints are validated
- ✅ Side effects are correct
- ✅ State transitions work properly
- ✅ Calculations are accurate

**Examples:**

- [type-conversions.spec.ts](../specs/transactions/type-conversions.spec.ts) - Transaction type conversion logic
- [balance-consistency.spec.ts](../specs/transactions/balance-consistency.spec.ts) - Account balance tracking

**Characteristics:**

- Multi-step operations
- State verification at each step
- Complex assertions
- Domain-specific validation
- May involve multiple resources

### 3. **Advanced Features Tests**

Tests for advanced API capabilities like filtering, sorting, pagination, and search:

- ✅ Complex query parameters
- ✅ Multiple filter combinations
- ✅ Sorting in different orders
- ✅ Pagination edge cases
- ✅ Performance scenarios

**Examples:**

- [advanced-filtering.spec.ts](../specs/transactions/advanced-filtering.spec.ts)

### 4. **Edge Cases Tests**

Tests that validate error handling, boundary conditions, and unusual scenarios:

- ✅ Invalid inputs
- ✅ Non-existent resources
- ✅ Duplicate operations
- ✅ Boundary values
- ✅ Error recovery

**Examples:**

- [relations-edge-cases.spec.ts](../specs/transactions/relations-edge-cases.spec.ts)

## Test Structure (AAA Pattern)

All tests follow the **Arrange-Act-Assert-Cleanup** pattern:

```typescript
test("should do something", async ({ api }) => {
  // 1. ARRANGE: Setup test data
  const resource = await api.createResource({
    field: "value",
  });
  const resourceId = resource.data!.id;

  // 2. ACT: Perform the operation being tested
  const result = await api.performOperation(resourceId);

  // 3. ASSERT: Verify the results
  expect(result.status).toBe(200);
  expect(result.data).toBeDefined();
  expect(result.data?.someField).toBe(expectedValue);

  // 4. CLEANUP: Remove test data
  await api.deleteResource(resourceId);
});
```

### Setup and Teardown

- **beforeAll**: Create shared test data (accounts, categories, etc.)
- **afterAll**: Clean up shared test data
- **Individual cleanup**: Clean up test-specific data after each test

```typescript
test.describe("Feature Tests", () => {
  let sharedAccountId: number;
  let sharedCategoryId: number;

  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    // Create shared test data
    const account = await accountAPI.createAccount({
      name: "Test Account",
      type: "expense" as const,
      amount: 5000,
      note: "Test account",
    });

    sharedAccountId = account.data!.id;
  });

  test("test case 1", async ({ transactionAPI }) => {
    // Use sharedAccountId
    const tx = await transactionAPI.createTransaction({
      accountId: sharedAccountId,
      // ...
    });

    // Test logic...

    // Cleanup test-specific data
    await transactionAPI.deleteTransaction(tx.data!.id);
  });

  test.afterAll(async ({ accountAPI }) => {
    // Cleanup shared data
    if (sharedAccountId) {
      await accountAPI.deleteAccount(sharedAccountId);
    }
  });
});
```

## Naming Conventions

### Test Suite Names

Use descriptive domain names:

```typescript
test.describe("Account API", () => {});
test.describe("Transaction Type Conversions - Business Requirements", () => {});
test.describe("Account Balance Consistency", () => {});
```

### Test Case Names

Use "should" statements that describe expected behavior:

```typescript
test("should create a new account with valid data", async ({
  accountAPI,
}) => {});
test("should fail to create account with invalid data", async ({
  accountAPI,
}) => {});
test("should convert expense to income with correct account balance changes", async ({
  transactionAPI,
}) => {});
```

### Variable Names

Use clear, descriptive names:

```typescript
// ✅ Good
const testAccountId = account.data!.id;
const expenseCategoryId = category.data!.id;
const initialBalance = account.data!.amount;

// ❌ Avoid
const id = account.data!.id;
const cat = category.data!.id;
const bal = account.data!.amount;
```

## Examples by Category

### Example 1: CRUD Test (Common)

```typescript
test.describe("Account API", () => {
  test.describe("POST /accounts", () => {
    test("should create a new account with valid data", async ({
      accountAPI,
    }) => {
      const accountData = {
        name: "Test Checking Account",
        type: "income" as const,
        amount: 1000,
        note: "Test account",
      };

      const response = await accountAPI.createAccount(accountData);

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data?.name).toBe(accountData.name);
      expect(response.data?.type).toBe(accountData.type);
      expect(response.data?.amount).toBe(accountData.amount);

      // Cleanup
      if (response.data?.id) {
        await accountAPI.deleteAccount(response.data.id);
      }
    });
  });
});
```

### Example 2: Business Requirements Test

```typescript
test.describe("Transaction Type Conversions - Business Requirements", () => {
  test.describe("Expense → Income Conversion", () => {
    test("should convert expense to income with correct account balance changes", async ({
      transactionAPI,
      accountAPI,
    }) => {
      // ARRANGE: Get initial balance
      const initialAccount = await accountAPI.getAccount(testAccountId);
      const initialBalance = initialAccount.data!.amount;

      // Create expense transaction (reduces balance)
      const expense = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: expenseCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const expenseId = expense.data!.id;

      // Verify balance decreased
      let currentAccount = await accountAPI.getAccount(testAccountId);
      expect(currentAccount.data!.amount).toBe(initialBalance - 100);

      // ACT: Convert to income
      await transactionAPI.updateTransaction(expenseId, {
        type: "income" as const,
        categoryId: incomeCategoryId,
      });

      // ASSERT: Verify balance increased by 200 (reversal + new income)
      currentAccount = await accountAPI.getAccount(testAccountId);
      expect(currentAccount.data!.amount).toBe(initialBalance + 100);

      // CLEANUP
      await transactionAPI.deleteTransaction(expenseId);
    });
  });
});
```

### Example 3: Advanced Features Test

```typescript
test.describe("Transaction Advanced Filtering", () => {
  test.describe("Amount Range Filtering", () => {
    test("should filter transactions by minimum amount", async ({
      transactionAPI,
    }) => {
      // ARRANGE: Create test transactions with different amounts
      const amounts = [50, 100, 150, 200];
      const txIds: number[] = [];

      for (const amount of amounts) {
        const tx = await transactionAPI.createTransaction({
          type: "expense" as const,
          amount,
          categoryId: testCategoryId,
          accountId: testAccountId,
          date: new Date().toISOString(),
        });
        txIds.push(tx.data!.id);
      }

      // ACT: Filter by minAmount = 100
      const response = await transactionAPI.getTransactions({
        minAmount: 100,
      });

      // ASSERT: Only transactions >= 100 should be returned
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      const filteredAmounts = response.data!.data.map((tx) => tx.amount);
      expect(filteredAmounts.every((amt) => amt >= 100)).toBe(true);

      // CLEANUP
      for (const txId of txIds) {
        await transactionAPI.deleteTransaction(txId);
      }
    });
  });
});
```

### Example 4: Edge Cases Test

```typescript
test.describe("Transaction Relations - Edge Cases", () => {
  test.describe("Relation Creation Edge Cases", () => {
    test("should prevent creating duplicate relations", async ({
      transactionAPI,
    }) => {
      // ARRANGE: Create two transactions
      const tx1 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 100,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx2 = await transactionAPI.createTransaction({
        type: "expense" as const,
        amount: 200,
        categoryId: testCategoryId,
        accountId: testAccountId,
        date: new Date().toISOString(),
      });

      const tx1Id = tx1.data!.id;
      const tx2Id = tx2.data!.id;

      // ACT: Create relation twice
      const firstRelation = await transactionAPI.createTransactionRelation(
        tx1Id,
        tx2Id
      );
      expect(firstRelation.status).toBeGreaterThanOrEqual(200);
      expect(firstRelation.status).toBeLessThan(300);

      const duplicateRelation = await transactionAPI.createTransactionRelation(
        tx1Id,
        tx2Id
      );

      // ASSERT: Should be idempotent (success) or return error
      // Both behaviors are acceptable for duplicate prevention
      expect([200, 201, 409]).toContain(duplicateRelation.status);

      // CLEANUP
      await transactionAPI.deleteTransactionRelation(tx1Id, tx2Id);
      await transactionAPI.deleteTransaction(tx1Id);
      await transactionAPI.deleteTransaction(tx2Id);
    });
  });
});
```

## Best Practices

### 1. **Test Independence**

Each test should be independent and not rely on other tests:

```typescript
// ✅ Good: Each test creates its own data
test("test 1", async ({ api }) => {
  const resource = await api.createResource({
    /* ... */
  });
  // Test logic...
  await api.deleteResource(resource.data!.id);
});

test("test 2", async ({ api }) => {
  const resource = await api.createResource({
    /* ... */
  });
  // Test logic...
  await api.deleteResource(resource.data!.id);
});

// ❌ Bad: Test 2 depends on Test 1
let sharedId: number;

test("test 1", async ({ api }) => {
  const resource = await api.createResource({
    /* ... */
  });
  sharedId = resource.data!.id; // ⚠️ Shared state between tests
});

test("test 2", async ({ api }) => {
  await api.useResource(sharedId); // ⚠️ Depends on test 1
});
```

### 2. **Proper Cleanup**

Always clean up test data, even when tests fail:

```typescript
test("should do something", async ({ api }) => {
  const resource = await api.createResource({
    /* ... */
  });
  const resourceId = resource.data!.id;

  try {
    // Test logic that might fail...
    expect(something).toBe(true);
  } finally {
    // Cleanup always runs
    await api.deleteResource(resourceId);
  }
});

// Or simpler: cleanup at the end (Playwright will still run if test fails)
test("should do something", async ({ api }) => {
  const resource = await api.createResource({
    /* ... */
  });
  const resourceId = resource.data!.id;

  // Test logic...
  expect(something).toBe(true);

  // Cleanup
  await api.deleteResource(resourceId);
});
```

### 3. **Clear Assertions**

Use specific assertions with clear expected values:

```typescript
// ✅ Good: Specific expectations
expect(response.status).toBe(200);
expect(response.data?.amount).toBe(1000);
expect(response.data?.type).toBe("expense");

// ❌ Bad: Vague assertions
expect(response.status).toBeGreaterThan(0);
expect(response.data).toBeTruthy();
```

### 4. **Business Logic Testing**

For business requirements, verify the complete flow:

```typescript
test("should maintain balance consistency", async ({
  transactionAPI,
  accountAPI,
}) => {
  // 1. Get initial state
  const initialAccount = await accountAPI.getAccount(accountId);
  const initialBalance = initialAccount.data!.amount;

  // 2. Perform operation
  const tx = await transactionAPI.createTransaction({
    type: "expense" as const,
    amount: 100,
    // ...
  });

  // 3. Verify intermediate state
  const afterCreate = await accountAPI.getAccount(accountId);
  expect(afterCreate.data!.amount).toBe(initialBalance - 100);

  // 4. Perform another operation
  await transactionAPI.updateTransaction(tx.data!.id, { amount: 200 });

  // 5. Verify final state
  const afterUpdate = await accountAPI.getAccount(accountId);
  expect(afterUpdate.data!.amount).toBe(initialBalance - 200);

  // 6. Cleanup
  await transactionAPI.deleteTransaction(tx.data!.id);

  // 7. Verify cleanup restored state
  const afterDelete = await accountAPI.getAccount(accountId);
  expect(afterDelete.data!.amount).toBe(initialBalance);
});
```

### 5. **Error Handling**

Test both success and failure cases:

```typescript
test.describe("Validation", () => {
  test("should succeed with valid data", async ({ api }) => {
    const response = await api.createResource({ valid: "data" });
    expect(response.status).toBe(201);
  });

  test("should fail with invalid data", async ({ api }) => {
    const response = await api.createResource({ invalid: "data" });
    expect(response.status).toBe(422);
    expect(response.error).toBeDefined();
  });
});
```

### 6. **Shared Test Data**

Use `beforeAll` for expensive setup shared across tests:

```typescript
test.describe("Feature Tests", () => {
  let sharedAccountId: number;
  let sharedCategoryId: number;

  // Create once, use many times
  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    const account = await accountAPI.createAccount({
      /* ... */
    });
    const category = await categoryAPI.createCategory({
      /* ... */
    });

    sharedAccountId = account.data!.id;
    sharedCategoryId = category.data!.id;
  });

  // Multiple tests use the shared data
  test("test 1", async ({ transactionAPI }) => {
    const tx = await transactionAPI.createTransaction({
      accountId: sharedAccountId,
      categoryId: sharedCategoryId,
      // ...
    });
    // ...
    await transactionAPI.deleteTransaction(tx.data!.id);
  });

  test("test 2", async ({ transactionAPI }) => {
    const tx = await transactionAPI.createTransaction({
      accountId: sharedAccountId,
      categoryId: sharedCategoryId,
      // ...
    });
    // ...
    await transactionAPI.deleteTransaction(tx.data!.id);
  });

  // Cleanup shared data once
  test.afterAll(async ({ accountAPI, categoryAPI }) => {
    await accountAPI.deleteAccount(sharedAccountId);
    await categoryAPI.deleteCategory(sharedCategoryId);
  });
});
```

## Summary

### When to Use Each Pattern

| Test Category             | When to Use                                    | File Naming                       |
| ------------------------- | ---------------------------------------------- | --------------------------------- |
| **CRUD (Common)**         | Basic operations, validation, authentication   | `{resource}.spec.ts`              |
| **Business Requirements** | Complex logic, state transitions, calculations | `{feature}-{description}.spec.ts` |
| **Advanced Features**     | Filtering, sorting, pagination, search         | `advanced-{feature}.spec.ts`      |
| **Edge Cases**            | Error handling, boundaries, unusual scenarios  | `{feature}-edge-cases.spec.ts`    |

### Test Suite Growth

As the application grows:

1. Start with **CRUD tests** for new resources
2. Add **business requirements tests** when domain logic emerges
3. Create **advanced features tests** for complex queries/operations
4. Add **edge cases tests** as bugs are discovered or requirements clarify

### Key Principles

- ✅ **Independence**: Tests don't depend on each other
- ✅ **Clarity**: Test names and assertions are self-documenting
- ✅ **Cleanup**: Always remove test data
- ✅ **AAA Pattern**: Arrange, Act, Assert, Cleanup
- ✅ **Type Safety**: Use generated OpenAPI types
- ✅ **Coverage**: Test both success and failure paths
