# Backend E2E Tests

Comprehensive end-to-end API tests for the Spenicle backend using Playwright with an **isolated Docker environment**.

## Overview

This test suite provides type-safe, automated testing for all backend API endpoints using Playwright's API testing capabilities. The tests run in a completely isolated Docker environment (separate PostgreSQL + backend instance) to ensure no interference with development data.

**Key Features:**

- 🔒 **Isolated Environment**: Dedicated PostgreSQL (port 5433) and API (port 8081)
- ✅ **Type-Safe**: All API calls fully typed based on OpenAPI spec
- 🎯 **Custom Fixtures**: Encapsulated API clients for clean test code
- 🔐 **Global Authentication**: Single login with token persistence
- 🧹 **Clean Tests**: Minimal boilerplate, focus on test logic
- 📊 **Comprehensive**: Tests for all CRUD operations and edge cases

## Quick Start

```bash
# Navigate to backend-bdd directory
cd apps/backend-bdd

# Install dependencies
bun install

# Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# Start isolated E2E environment
sudo docker compose up -d

# Run tests
bun run test

# Stop environment
sudo docker compose down
```

See **[docs/setup.md](./docs/setup.md)** for detailed setup instructions.

## Structure

```
backend-bdd/
├── fixtures/              # Type-safe API client fixtures
│   ├── index.ts          # Main fixture exports
│   ├── base-client.ts    # Base API client with common utilities
│   ├── auth-client.ts    # Authentication API methods
│   ├── account-client.ts # Account API methods
│   ├── category-client.ts # Category API methods
│   └── transaction-client.ts # Transaction API methods
├── specs/                # Test specifications organized by endpoint
│   ├── auth/
│   ├── accounts/
│   ├── categories/
│   └── transactions/
├── types/                # TypeScript type definitions
│   └── common.ts        # Common types and interfaces
├── docs/                 # Test documentation
├── playwright.config.ts  # Playwright configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Features

- ✅ **Type-Safe**: All API calls are fully typed based on OpenAPI spec
- ✅ **Custom Fixtures**: Encapsulated API clients for clean test code
- ✅ **Before/After Hooks**: Automatic setup and teardown
- ✅ **Authentication**: Automatic login for authenticated tests
- ✅ **Clean Tests**: Minimal boilerplate, focus on test logic
- ✅ **Comprehensive**: Tests for all CRUD operations and edge cases

## Prerequisites

- Node.js 18+ or Bun
- Docker and Docker Compose
- Access to the backend API

## Setup

### 1. Install Dependencies

```bash
cd apps/backend-bdd
npm install
# or
bun install
```

### 2. Configure Environment

Copy the example environment file and update as needed:

```bash
cp .env.example .env
```

Edit `.env` to match your setup:

```env
API_BASE_URL=http://localhost:8080
ADMIN_USERNAME=testuser
ADMIN_PASSWORD=testpassword
```

### 3. Start Backend Services

From the repository root:

```bash
# Start PostgreSQL and backend API
docker-compose up -d

# Or use the npm script
npm run docker:up
```

Wait for services to be healthy:

```bash
docker-compose ps
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Suite

```bash
# Run only auth tests
npx playwright test specs/auth

# Run only account tests
npx playwright test specs/accounts

# Run only transaction tests
npx playwright test specs/transactions
```

### Run Tests in UI Mode

```bash
npm run test:ui
```

### Run Tests in Debug Mode

```bash
npm run test:debug
```

### Run Tests in Headed Mode

```bash
npm run test:headed
```

### View Test Report

```bash
npm run test:report
```

## Writing Tests

### Basic Test Structure

Tests use custom fixtures that provide type-safe API clients:

```typescript
import { test, expect } from "../../fixtures";

test.describe("My Feature", () => {
  // Use authenticatedContext for tests that need authentication
  test.use({ authenticatedContext: {} as any });

  test("should do something", async ({ accountAPI }) => {
    // Use the API client directly
    const response = await accountAPI.getAccounts();

    // Assert response
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  });
});
```

### Available Fixtures

- **`authAPI`**: Authentication operations (login, refresh)
- **`accountAPI`**: Account CRUD operations
- **`categoryAPI`**: Category CRUD operations
- **`transactionAPI`**: Transaction CRUD operations
- **`testContext`**: Shared context (tokens, base URL)
- **`authenticatedContext`**: Auto-login fixture

### Example: Creating and Cleaning Up Resources

```typescript
test("should create and delete account", async ({ accountAPI }) => {
  // Create
  const createResponse = await accountAPI.createAccount({
    name: "Test Account",
    accountType: "checking",
    currency: "USD",
    amount: 1000,
  });

  expect(createResponse.status).toBe(201);
  expect(createResponse.data?.id).toBeDefined();

  const accountId = createResponse.data!.id;

  // Use the account...

  // Cleanup
  await accountAPI.deleteAccount(accountId);
});
```

### Example: Using Hooks

```typescript
test.describe('Transaction Tests', () => {
  let accountId: string;
  let categoryId: string;

  // Setup before all tests
  test.beforeAll(async ({ accountAPI, categoryAPI }) => {
    const account = await accountAPI.createAccount({...});
    const category = await categoryAPI.createCategory({...});

    accountId = account.data!.id;
    categoryId = category.data!.id;
  });

  test('should create transaction', async ({ transactionAPI }) => {
    // Use accountId and categoryId
  });

  // Cleanup after all tests
  test.afterAll(async ({ accountAPI, categoryAPI }) => {
    await accountAPI.deleteAccount(accountId);
    await categoryAPI.deleteCategory(categoryId);
  });
});
```

## API Client Methods

### AuthAPIClient

- `login(username, password)` - Login and store tokens
- `refresh(refreshToken?)` - Refresh access token
- `logout()` - Clear stored tokens

### AccountAPIClient

- `getAccounts(params?)` - Get paginated accounts
- `getAccount(id)` - Get single account
- `createAccount(data)` - Create new account
- `updateAccount(id, data)` - Update account
- `deleteAccount(id)` - Delete account
- `reorderAccounts(data)` - Reorder accounts
- `archiveAccount(id)` - Archive account
- `unarchiveAccount(id)` - Unarchive account

### CategoryAPIClient

- `getCategories(params?)` - Get paginated categories
- `getCategory(id)` - Get single category
- `createCategory(data)` - Create new category
- `updateCategory(id, data)` - Update category
- `deleteCategory(id)` - Delete category
- `reorderCategories(data)` - Reorder categories
- `archiveCategory(id)` - Archive category
- `unarchiveCategory(id)` - Unarchive category

### TransactionAPIClient

- `getTransactions(params?)` - Get paginated transactions
- `getTransaction(id)` - Get single transaction
- `createTransaction(data)` - Create new transaction
- `updateTransaction(id, data)` - Update transaction
- `deleteTransaction(id)` - Delete transaction
- `getTransactionTags(id)` - Get transaction tags
- `addTransactionTag(id, tagName)` - Add tag to transaction
- `updateTransactionTags(id, tagIds)` - Update transaction tags
- `getTransactionRelations(id)` - Get transaction relations
- `createTransactionRelation(id, relatedId)` - Create relation
- `deleteTransactionRelation(id, relatedId)` - Delete relation

## Test Organization

Tests are organized by endpoint/resource:

- `specs/auth/` - Authentication tests
- `specs/accounts/` - Account endpoint tests
- `specs/categories/` - Category endpoint tests
- `specs/transactions/` - Transaction endpoint tests

Each test file follows the pattern:

1. Describe the API endpoint
2. Test successful operations (happy path)
3. Test error cases (sad path)
4. Test edge cases
5. Clean up resources

## CI/CD Integration

The tests are designed to run in CI/CD pipelines:

```bash
# In your CI pipeline
docker-compose up -d
npm test
docker-compose down
```

The `playwright.config.ts` automatically enables features like retries and proper reporters for CI environments.

## Troubleshooting

### Tests Failing with 401 Unauthorized

- Check that `ADMIN_USERNAME` and `ADMIN_PASSWORD` are correct in `.env`
- Ensure the backend has created the test user
- Verify the backend is running and accessible

### Connection Refused Errors

- Ensure Docker services are running: `docker-compose ps`
- Check that `APP_PORT` spenicle service is correct in `.env`
- Verify the backend is healthy: `curl http://localhost:${APP_PORT}`

### Database State Issues

Reset the database:

```bash
npm run docker:reset
```

This will destroy volumes and recreate fresh containers.

### Type Errors

Regenerate types from OpenAPI spec:

```bash
npm run generate:types
```

## Best Practices

1. **Always clean up**: Delete resources created in tests
2. **Use beforeAll/afterAll**: For shared test setup
3. **Test isolation**: Each test should be independent
4. **Clear assertions**: Use descriptive expect statements
5. **Meaningful names**: Test names should describe what they test
6. **Error testing**: Always test error cases, not just happy paths

## Contributing

When adding new endpoints:

1. Create a new client in `fixtures/` (e.g., `budget-client.ts`)
2. Add the client to `fixtures/index.ts`
3. Create test specs in `specs/{endpoint}/`
4. Update this README with new methods

## Resources

- [Playwright API Testing](https://playwright.dev/docs/api-testing)
- [Playwright Fixtures](https://playwright.dev/docs/test-fixtures)
- [Backend API Documentation](../backend/README.md)
- [OpenAPI Spec](../../openapi.yaml)
