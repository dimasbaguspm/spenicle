# Testing Standards

## Overview

This document defines testing patterns, practices, and standards for this codebase. Tests are organized by layer (repository, service, resource) with specific guidelines for each.

## Testing Philosophy

- **Tests are documentation** - Test names and structure should clearly communicate intent
- **Layer isolation** - Each layer tests only its responsibilities
- **Mock dependencies** - Use interfaces and mocks to isolate the system under test
- **Fast feedback** - Unit tests should run quickly without external dependencies
- **Behavior over implementation** - Test what code does, not how it does it

## Test Organization

### File Structure

```
internal/
├── repositories/
│   ├── account_repository.go
│   └── account_repository_test.go          # Repository tests
├── services/
│   ├── account_service.go
│   └── account_service_test.go             # Service tests
└── resources/
    ├── account_resource.go
    └── account_resource_test.go            # Resource/HTTP tests
```

### Naming Conventions

**Test Functions:**

```go
func Test<MethodName>_<Scenario>(t *testing.T)

// Examples:
func TestUpdate_NoFieldsProvided(t *testing.T)
func TestGet_AccountNotFound(t *testing.T)
func TestCreate_Success(t *testing.T)
```

**Test File Names:**

- Always suffix with `_test.go`
- Mirror the source file name: `account_service.go` → `account_service_test.go`

## Layer-Specific Testing

### 1. Repository Tests (`internal/repositories/`)

**Purpose:** Test SQL queries, row scanning, and database error handling

**Tools:**

- `pgxmock` for mocking database connections
- Standard library `testing` package

**What to Test:**

- SQL query structure and parameters
- Row scanning into schema types
- Error handling (connection errors, constraint violations, no rows)
- RETURNING clauses work correctly
- Transaction behavior (if applicable)

**Example Pattern:**

```go
func TestGet_Success(t *testing.T) {
    mock, err := pgxmock.NewConn()
    if err != nil {
        t.Fatal(err)
    }
    defer mock.Close(context.Background())

    repo := NewAccountRepository(mock)

    // Set expectations for SQL query
    rows := pgxmock.NewRows([]string{"id", "name", "type", "amount"}).
        AddRow(int64(1), "Test", "income", int64(1000))

    mock.ExpectQuery("SELECT (.+) FROM accounts WHERE id = \\$1").
        WithArgs(int64(1)).
        WillReturnRows(rows)

    result, err := repo.Get(context.Background(), 1)

    assert.NoError(t, err)
    assert.Equal(t, int64(1), result.ID)
    assert.NoError(t, mock.ExpectationsWereMet())
}
```

**Key Points:**

- Assert SQL structure with regex patterns
- Verify query parameters
- Test error paths (pgx.ErrNoRows, constraint violations)
- Keep tests focused on data layer concerns only

---

### 2. Service Tests (`internal/services/`)

**Purpose:** Test business logic, validation rules, and error translation

**Tools:**

- Lightweight function-based mocks implementing store interfaces
- Standard library `testing` package
- No external dependencies (no real DB, no HTTP)

**What to Test:**

- **Business validation logic** - Rules that aren't in schema tags
- **Error translation** - DB errors → Domain errors
- **Domain rules enforcement** - Business constraints
- **Cross-field validation** - Rules spanning multiple fields

**Example Pattern:**

```go
func TestUpdate_BusinessValidation_NoFieldsProvided(t *testing.T) {
    mockStore := &MockAccountStore{}
    service := NewAccountService(mockStore)

    // All fields nil - violates business rule
    emptyUpdate := schemas.UpdateAccountSchema{}

    _, err := service.Update(context.Background(), 1, emptyUpdate)

    if err != ErrNoFieldsToUpdate {
        t.Errorf("expected ErrNoFieldsToUpdate, got %v", err)
    }

    // Store should NOT be called since validation fails early
    mockStore.AssertNotCalled(t, "Update")
}
```

**Mock Pattern:**

```go
type MockAccountStore struct {
    UpdateFunc   func(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error)
    updateCalled bool
}

func (m *MockAccountStore) Update(ctx context.Context, id int64, data schemas.UpdateAccountSchema) (schemas.AccountSchema, error) {
    m.updateCalled = true
    if m.UpdateFunc != nil {
        return m.UpdateFunc(ctx, id, data)
    }
    return schemas.AccountSchema{}, nil
}
```

**Key Points:**

- Focus on business logic only (not SQL, not HTTP)
- Test domain error returns (`ErrAccountNotFound`, `ErrNoFieldsToUpdate`)
- Verify store is/isn't called appropriately
- Test error translation from DB layer to domain layer

**What NOT to Test:**

- SQL queries (repository's job)
- HTTP status codes (resource's job)
- Schema validation (Huma's job)

---

### 3. Resource Tests (`internal/resources/`)

**Purpose:** Test HTTP concerns, status codes, and error-to-HTTP translation

**Tools:**

- `humatest` for HTTP testing
- Mock service implementations
- Standard library `testing` package

**What to Test:**

- **HTTP status codes** - 200, 201, 400, 404, 422, 500
- **Request/response mapping** - Body, query params, path params
- **Service error translation** - Domain errors → HTTP errors
- **Endpoint registration** - All routes are properly registered
- **Method validation** - Correct HTTP methods allowed

**Example Pattern:**

```go
func TestGet_NotFound(t *testing.T) {
    mockService := &MockAccountService{
        GetFunc: func(ctx context.Context, id int64) (schemas.AccountSchema, error) {
            return schemas.AccountSchema{}, services.ErrAccountNotFound
        },
    }
    api, _ := setupTestAPI(t, mockService)

    resp := api.Get("/accounts/999")

    if resp.Code != http.StatusNotFound {
        t.Errorf("expected 404, got %d", resp.Code)
    }
}
```

**Mock Pattern:**

```go
type MockAccountService struct {
    GetFunc func(ctx context.Context, id int64) (schemas.AccountSchema, error)
}

func (m *MockAccountService) Get(ctx context.Context, id int64) (schemas.AccountSchema, error) {
    if m.GetFunc != nil {
        return m.GetFunc(ctx, id)
    }
    return schemas.AccountSchema{}, nil
}
```

**Key Points:**

- Test HTTP layer only (not business logic)
- Verify correct status codes for each scenario
- Test validation errors return 422 (Huma handles this)
- Ensure proper error translation (ErrAccountNotFound → 404)
- Use table-driven tests for validation scenarios

**What NOT to Test:**

- Business validation logic (service's job)
- SQL queries (repository's job)
- Detailed schema validation (Huma handles this via tags)

---

## Test Data Patterns

### Table-Driven Tests

Use for multiple similar scenarios:

```go
func TestCreate_ValidationErrors(t *testing.T) {
    tests := []struct {
        name       string
        body       map[string]interface{}
        expectCode int
    }{
        {
            name: "missing name",
            body: map[string]interface{}{
                "type": "income",
                "amount": 1000,
            },
            expectCode: http.StatusUnprocessableEntity,
        },
        {
            name: "negative amount",
            body: map[string]interface{}{
                "name": "Test",
                "type": "income",
                "amount": -100,
            },
            expectCode: http.StatusUnprocessableEntity,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            resp := api.Post("/accounts", tt.body)
            if resp.Code != tt.expectCode {
                t.Errorf("expected %d, got %d", tt.expectCode, resp.Code)
            }
        })
    }
}
```

### Helper Functions

Create helpers for common test setup:

```go
// Pointer helpers
func stringPtr(s string) *string { return &s }
func int64Ptr(i int64) *int64 { return &i }

// Test setup helpers
func setupTestAPI(t *testing.T, service AccountService) humatest.TestAPI {
    _, api := humatest.New(t)
    resource := NewAccountResource(service)
    resource.RegisterRoutes(api)
    return api
}
```

---

## Testing Checklist

### Before Writing Tests

- [ ] Identify which layer you're testing (repository/service/resource)
- [ ] Understand the responsibilities of that layer
- [ ] Identify dependencies that need mocking
- [ ] Consider edge cases and error paths

### For Each Test

- [ ] Test name clearly describes the scenario
- [ ] Test focuses on one behavior
- [ ] Mocks are used to isolate the unit under test
- [ ] Both success and error paths are tested
- [ ] Test is deterministic (no randomness, no external dependencies)

### Repository Tests

- [ ] SQL queries are validated with pgxmock
- [ ] Row scanning is tested
- [ ] Error handling (ErrNoRows, connection errors) is covered
- [ ] Query parameters are verified

### Service Tests

- [ ] Business validation rules are tested
- [ ] Domain errors are returned correctly
- [ ] Error translation (DB → domain) works
- [ ] Store is called/not called appropriately

### Resource Tests

- [ ] HTTP status codes are correct
- [ ] Request/response bodies are validated
- [ ] Service errors translate to correct HTTP errors
- [ ] All endpoints are registered and accessible

---

## Running Tests

### Run All Tests

```bash
go test ./...
```

### Run Tests Verbosely

```bash
go test ./... -v
```

### Run Specific Package

```bash
go test ./internal/services/...
go test ./internal/repositories/...
go test ./internal/resources/...
```

### Run Specific Test

```bash
go test ./internal/services -run TestUpdate_NoFieldsProvided
```

### With Coverage

```bash
go test ./... -cover
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

---

## Common Patterns & Anti-Patterns

### ✅ DO

- Test behavior, not implementation
- Use descriptive test names
- Keep tests simple and focused
- Test error paths thoroughly
- Use table-driven tests for similar scenarios
- Mock dependencies via interfaces
- Assert expected outcomes clearly

### ❌ DON'T

- Test multiple layers in one test
- Use real databases in unit tests
- Test third-party library internals (Huma, pgx)
- Make tests depend on each other
- Use global state or singletons
- Test private functions (test through public API)
- Over-mock (mock what you own, not what you don't)

---

## Example Test Files

See working examples in:

- Repository: [internal/repositories/account_repository_test.go](../internal/repositories/account_repository_test.go)
- Service: [internal/services/account_service_test.go](../internal/services/account_service_test.go)
- Resource: [internal/resources/account_resource_test.go](../internal/resources/account_resource_test.go)

---

## Quick Reference

| Layer          | Tests                                         | Mocks                        | Focus         |
| -------------- | --------------------------------------------- | ---------------------------- | ------------- |
| **Repository** | SQL, scanning, DB errors                      | `pgxmock`                    | Data access   |
| **Service**    | Business logic, validation, error translation | Function-based store mocks   | Domain rules  |
| **Resource**   | HTTP codes, request/response                  | Function-based service mocks | HTTP concerns |

---

## Additional Resources

- [Table-driven tests in Go](https://dave.cheney.net/2019/05/07/prefer-table-driven-tests)
- [Testing Go Applications](https://golang.org/doc/tutorial/add-a-test)
- [Huma Testing Guide](https://huma.rocks/tutorial/testing/)
