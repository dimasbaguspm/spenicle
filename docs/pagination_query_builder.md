# Pagination & Query Builder Enhancement

## Overview

Enhanced the search/pagination feature across all resources (accounts, categories, transactions) to support filtering by arrays of IDs and types. This allows users to query multiple items in a single request.

Additionally, introduced a reusable `queryBuilder` utility pattern in [`internal/utils/query_builder.go`](../internal/utils/query_builder.go) to improve code readability and maintainability while maintaining security and performance.

## Changes Made

### 1. Schema Updates

Updated search parameter schemas to support array fields:

#### Account Search Parameters (`account_search_param_schema.go`)

- `ID []int` - Filter by multiple account IDs
- `Type []string` - Filter by multiple account types (expense, income)

#### Category Search Parameters (`category_search_param_schema.go`)

- `ID []int` - Filter by multiple category IDs
- `Type []string` - Filter by multiple category types (expense, income)

#### Transaction Search Parameters (`transaction_search_param_schema.go`)

- `ID []int` - Filter by multiple transaction IDs
- `Type []string` - Filter by multiple transaction types (expense, income, transfer)
- `AccountIDs []int` - Filter by multiple account IDs
- `CategoryIDs []int` - Filter by multiple category IDs

### 2. Query Parameter Parsing

Updated `ParseFromQuery()` methods in all three schemas to:

- Extract all values for array parameters from URL query strings
- Support multiple occurrences of the same parameter (e.g., `?id=1&id=2&type=expense&type=income`)
- Maintain backward compatibility with single-value parameters

### 3. Repository Layer Updates

All repositories now use the shared **`queryBuilder`** utility from [`internal/utils/query_builder.go`](../internal/utils/query_builder.go) for cleaner, more maintainable code.

#### Query Builder Pattern

The `queryBuilder` provides a fluent interface for constructing SQL WHERE clauses:

```go
// Example usage in repository List() methods
qb := utils.QueryBuilder("deleted_at IS NULL")
qb.AddInFilter("id", params.ID)
qb.AddInFilterString("type", params.Type)
qb.AddLikeFilter("name", params.Name)

// Build ORDER BY with validated columns
validColumns := map[string]string{
    "name": "name",
    "createdAt": "created_at",
    "updatedAt": "updated_at",
}
orderBy := qb.BuildOrderBy(params.OrderBy, params.OrderDirection, validColumns)

// Generate SQL
countSQL := fmt.Sprintf("SELECT COUNT(*) FROM accounts %s", qb.ToWhereClause())
err := r.db.QueryRow(ctx, countSQL, qb.GetArgs()...).Scan(&totalCount)
```

**Benefits:**

- ✅ **Readability**: Declarative filter API instead of repetitive boilerplate
- ✅ **Maintainability**: Single source of truth for query building logic
- ✅ **Security**: Maintains parameterized queries (no SQL injection risk)
- ✅ **Performance**: No overhead, compiler optimizes method calls
- ✅ **Reusability**: Can be used across all repositories

**Available Methods:**

- `QueryBuilder(initialCondition)` - Creates new builder with initial WHERE condition
- `AddInFilter(column, values)` - Adds IN clause for integer arrays
- `AddInFilterString(column, values)` - Adds IN clause for string arrays
- `AddLikeFilter(column, value)` - Adds ILIKE clause for partial text matching
- `BuildOrderBy(orderBy, orderDirection, validColumns)` - Builds safe ORDER BY clause with column mapping
- `ToWhereClause()` - Returns complete WHERE clause string
- `GetArgs()` - Returns slice of query arguments
- `NextArgIndex()` - Returns next argument index for LIMIT/OFFSET

#### Account Repository (`account_repository.go`)

- Refactored `List()` method to use `queryBuilder` pattern
- Clean, declarative filter definitions
- Supports ID, name, and type array filters
- Count query respects all filters

**Before (repetitive):**

```go
where := "WHERE deleted_at IS NULL"
args := []any{}
argIndex := 1

if len(params.ID) > 0 {
    placeholders := r.buildPlaceholders(argIndex, len(params.ID))
    where += fmt.Sprintf(" AND id IN (%s)", placeholders)
    for _, id := range params.ID {
        args = append(args, id)
    }
    argIndex += len(params.ID)
}
// ... repeat for each filter
```

**After (clean):**

```go
qb := utils.QueryBuilder("deleted_at IS NULL")
qb.AddInFilter("id", params.ID)
qb.AddLikeFilter("name", params.Name)
qb.AddInFilterString("type", params.Type)

// ORDER BY also handled by query builder
validColumns := map[string]string{
    "name": "name",
    "createdAt": "created_at",
}
orderBy := qb.BuildOrderBy(params.OrderBy, params.OrderDirection, validColumns)
```

#### Category Repository (`category_repository.go`)

- Applied same `queryBuilder` pattern
- Support for ID, name, and type array filters
- Reduced code duplication

#### Transaction Repository (`transaction_repository.go`)

- Uses `queryBuilder` for cleaner filter management
- Changed from single-value filters to array filters:
  - `Type` string → `Type []string` with `IN` clause
  - `AccountID` int → `AccountIDs []int` with `IN` clause
  - `CategoryID` int → `CategoryIDs []int` with `IN` clause
- Added `ID []int` filter support
- Count query respects all filters

### 4. Query Builder Implementation

Location: [`internal/utils/query_builder.go`](../internal/utils/query_builder.go)

Key features:

- **Encapsulation**: All WHERE clause and ORDER BY logic in one place
- **Type Safety**: Separate methods for int and string arrays
- **Auto-indexing**: Automatically manages PostgreSQL parameter indices ($1, $2, etc.)
- **Conditional Filters**: Only adds filters when values are provided (empty arrays ignored)
- **Column Mapping**: Maps camelCase parameter names to snake_case database columns
- **SQL Injection Prevention**: Uses parameterized queries exclusively
- **Validation**: ORDER BY validates both column names and sort direction

### 5. Test Updates

Updated all test files to use array fields:

- `account_search_param_schema_test.go` - Updated assertions for array fields
- `category_search_param_schema_test.go` - Added slice comparison logic
- `transaction_search_param_schema_test.go` - Updated to use `AccountIDs` and `CategoryIDs`
- `transaction_repository_test.go` - Updated test expectations for array filters

## Usage Examples

### Filter by Multiple IDs

```
GET /accounts?id=1&id=2&id=3
GET /categories?id=5&id=10
GET /transactions?id=1&id=2
```

### Filter by Multiple Types

```
GET /accounts?type=expense&type=income
GET /categories?type=expense
GET /transactions?type=expense&type=income
```

### Filter Transactions by Multiple Accounts and Categories

```
GET /transactions?accountId=1&accountId=2&categoryId=5&categoryId=10
```

### Combined Filters

```
GET /transactions?id=1&id=2&type=expense&type=income&accountId=1&accountId=2
```

## Technical Details

### Query Builder Architecture

The `queryBuilder` utility ([`internal/utils/query_builder.go`](../internal/utils/query_builder.go)) provides:

1. **Fluent Interface**: Chain method calls for readable code
2. **Automatic Parameter Indexing**: Manages PostgreSQL `$1, $2, $3` placeholders
3. **Conditional Logic**: Skips empty arrays automatically
4. **Type-Safe Methods**: Separate methods for different data types

**Internal Structure:**

```go
type queryBuilder struct {
    conditions []string  // WHERE clause conditions
    args       []any     // Query parameters
    argIndex   int       // Current parameter index
}
```

### SQL Query Pattern

Before (single-value):

```sql
WHERE deleted_at IS NULL AND type = $1
```

After (array-based):

```sql
WHERE deleted_at IS NULL AND type IN ($1,$2,$3)
```

### Parameterized Queries with Query Builder

The `queryBuilder` handles all parameter binding and ORDER BY construction safely:

```go
// Using queryBuilder for complete query building
qb := utils.QueryBuilder("deleted_at IS NULL")
qb.AddInFilter("id", []int{1, 2, 3})
qb.AddInFilterString("type", []string{"expense", "income"})

// Generates WHERE clause:
// WHERE: "WHERE deleted_at IS NULL AND id IN ($1,$2,$3) AND type IN ($4,$5)"
// Args:  [1, 2, 3, "expense", "income"]

// Build ORDER BY with column name validation
validColumns := map[string]string{
    "name": "name",
    "createdAt": "created_at",  // Maps camelCase to snake_case
}
orderBy := qb.BuildOrderBy("createdAt", "desc", validColumns)
// Returns: "ORDER BY created_at DESC"
```

**Benefits over manual approach:**

- No manual index tracking
- No string concatenation errors
- Centralized ORDER BY logic (no duplication across repositories)
- Automatic camelCase to snake_case column mapping
- Safe validation of column names and sort direction
- Cleaner, more maintainable code
- Easy to add new filter types

## Performance & Security

### Security ✅

- **SQL Injection Prevention**: All queries use PostgreSQL parameterized queries
- **No String Concatenation**: User input never concatenated into SQL
- **Type Safety**: Go type system prevents type confusion
- **Validated Columns**: Only predefined columns allowed in ORDER BY clauses

### Performance ✅

- **No Overhead**: `queryBuilder` methods are simple and inline-able
- **Efficient Allocation**: Pre-allocates slices when sizes are known
- **Query Plan Reuse**: Same query structure allows PostgreSQL to cache plans
- **Single Database Round-Trip**: Count and data queries use same connection

### Maintainability ✅

- **DRY Principle**: All query building logic (WHERE + ORDER BY) in one place ([`utils/query_builder.go`](../internal/utils/query_builder.go))
- **No Duplication**: ORDER BY logic previously duplicated across 3 repositories, now centralized
- **Easy Testing**: `queryBuilder` can be unit tested independently
- **Clear Intent**: Method names document what filters do
- **Extensible**: New filter types added by implementing new methods
- **Consistent Behavior**: Same validation logic applied across all repositories

## Testing

All tests pass successfully:

```bash
go test ./...
# All packages: ok
```

Test coverage includes:

- Schema parsing with array parameters
- Repository filter logic with query builder
- End-to-end resource tests with multiple filters

## Backward Compatibility

The implementation maintains full backward compatibility:

- Single-value query parameters still work (e.g., `?type=expense`)
- Empty arrays are handled gracefully (no filter applied)
- Existing endpoints and behavior remain unchanged
