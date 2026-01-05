# Embedded Data Pattern — Guide

Purpose: Efficiently return related entity data within API responses without requiring separate requests, using SQL JOINs and lightweight schema types.

## Overview

The embedded data pattern solves the N+1 query problem by fetching related entities in a single database query and including only essential fields in the response. This improves API performance and reduces frontend complexity.

**Benefits:**

- Single database query instead of N+1 queries for related entities
- Reduced response payload (only essential fields)
- Better frontend DX (no need for multiple API calls)
- Type-safe with dedicated lightweight schemas

**Use cases:**

- Transaction responses include account/category information
- Budget responses include template and account information
- Any scenario where the frontend needs basic info about related entities

## Pattern Structure

### 1. Create Lightweight Schemas

Define dedicated schema types for embedded data with only essential fields.

**Example:** `TransactionAccountSchema` for account data in transaction responses

```go
// TransactionAccountSchema represents basic account information in transaction responses
type TransactionAccountSchema struct {
    ID        int64   `json:"id" doc:"Account ID" example:"1"`
    Name      string  `json:"name" doc:"Account name" example:"Cash"`
    Type      string  `json:"type" doc:"Account type" enum:"expense,income" example:"expense"`
    Amount    int64   `json:"amount" doc:"Account balance" example:"100000"`
    Icon      *string `json:"icon,omitempty" doc:"Icon identifier" example:"wallet"`
    IconColor *string `json:"iconColor,omitempty" doc:"Icon color" example:"#4CAF50"`
}
```

**Guidelines:**

- Name pattern: `{ParentEntity}{RelatedEntity}Schema` (e.g., `TransactionAccountSchema`)
- Include only fields needed by the frontend
- Omit metadata: `createdAt`, `updatedAt`, `deletedAt`, `archivedAt`, `note`, `displayOrder`
- Keep nullable fields as pointers (*string, *int64, etc.)
- Add proper Huma tags for OpenAPI documentation

### 2. Update Parent Schema

Use lightweight schemas in the parent entity instead of full entity schemas.

**Example:** `TransactionSchema` using lightweight embedded schemas

```go
type TransactionSchema struct {
    ID                 int                        `json:"id"`
    Type               string                     `json:"type"`
    Date               time.Time                  `json:"date"`
    Amount             int                        `json:"amount"`
    Account            TransactionAccountSchema   `json:"account"`
    Category           TransactionCategorySchema  `json:"category"`
    DestinationAccount *TransactionAccountSchema  `json:"destinationAccount,omitempty"`
    Note               *string                    `json:"note"`
    CreatedAt          time.Time                  `json:"createdAt"`
    UpdatedAt          time.Time                  `json:"updatedAt"`
    DeletedAt          *time.Time                 `json:"deletedAt,omitempty"`
    // Internal fields for DB operations (not serialized to JSON)
    AccountID            int  `json:"-"`
    CategoryID           int  `json:"-"`
    DestinationAccountID *int `json:"-"`
}
```

**Important:**

- Keep internal ID fields with `json:"-"` tag for database operations (create/update)
- Use pointer types for nullable embedded objects
- Embedded objects replace the need for separate API calls

### 3. Implement Repository JOINs

Update repository List() and Get() methods to fetch embedded data using SQL JOINs.

**Example:** Transaction repository Get method

```go
func (r *TransactionRepository) Get(ctx context.Context, id int) (schemas.TransactionSchema, error) {
    sql := `SELECT
        t.id, t.type, t.date, t.amount, t.note, t.created_at, t.updated_at, t.deleted_at,
        -- Account info
        a.id, a.name, a.type, a.amount, a.icon, a.icon_color,
        -- Category info
        c.id, c.name, c.type, c.icon, c.icon_color,
        -- Destination account info (nullable)
        da.id, da.name, da.type, da.amount, da.icon, da.icon_color
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id AND a.deleted_at IS NULL
        JOIN categories c ON t.category_id = c.id AND c.deleted_at IS NULL
        LEFT JOIN accounts da ON t.destination_account_id = da.id AND da.deleted_at IS NULL
        WHERE t.id = $1 AND t.deleted_at IS NULL`

    var transaction schemas.TransactionSchema
    var destAccountID, destAccountAmount *int64
    var destAccountName, destAccountType, destAccountIcon, destAccountIconColor *string

    err := r.db.QueryRow(ctx, sql, id).Scan(
        &transaction.ID,
        &transaction.Type,
        &transaction.Date,
        &transaction.Amount,
        &transaction.Note,
        &transaction.CreatedAt,
        &transaction.UpdatedAt,
        &transaction.DeletedAt,
        // Account
        &transaction.Account.ID,
        &transaction.Account.Name,
        &transaction.Account.Type,
        &transaction.Account.Amount,
        &transaction.Account.Icon,
        &transaction.Account.IconColor,
        // Category
        &transaction.Category.ID,
        &transaction.Category.Name,
        &transaction.Category.Type,
        &transaction.Category.Icon,
        &transaction.Category.IconColor,
        // Destination Account (nullable)
        &destAccountID,
        &destAccountName,
        &destAccountType,
        &destAccountAmount,
        &destAccountIcon,
        &destAccountIconColor,
    )

    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return schemas.TransactionSchema{}, ErrTransactionNotFound
        }
        return schemas.TransactionSchema{}, fmt.Errorf("get transaction: %w", err)
    }

    // Populate internal ID fields for DB operations
    transaction.AccountID = int(transaction.Account.ID)
    transaction.CategoryID = int(transaction.Category.ID)

    // Populate destination account if present
    if destAccountID != nil {
        destAccID := int(*destAccountID)
        transaction.DestinationAccountID = &destAccID
        transaction.DestinationAccount = &schemas.TransactionAccountSchema{
            ID:        *destAccountID,
            Name:      *destAccountName,
            Type:      *destAccountType,
            Amount:    *destAccountAmount,
            Icon:      destAccountIcon,
            IconColor: destAccountIconColor,
        }
    }

    return transaction, nil
}
```

**Key points:**

- Use `JOIN` for required relationships (always present)
- Use `LEFT JOIN` for optional relationships (nullable)
- Check for soft deletes in JOIN conditions
- Declare temporary variables for nullable embedded data
- Scan into temporary variables, then conditionally populate embedded objects
- Always populate internal ID fields from embedded object IDs

### 4. Update Paginated Scanning

For List operations, update the `FromRows()` method to handle embedded data.

**Example:** `PaginatedTransactionSchema.FromRows()`

```go
func (p *PaginatedTransactionSchema) FromRows(rows pgx.Rows) error {
    for rows.Next() {
        var transaction TransactionSchema
        var destAccountID, destAccountAmount *int64
        var destAccountName, destAccountType, destAccountIcon, destAccountIconColor *string

        err := rows.Scan(
            &transaction.ID,
            &transaction.Type,
            &transaction.Date,
            &transaction.Amount,
            &transaction.Note,
            &transaction.CreatedAt,
            &transaction.UpdatedAt,
            &transaction.DeletedAt,
            // Account
            &transaction.Account.ID,
            &transaction.Account.Name,
            &transaction.Account.Type,
            &transaction.Account.Amount,
            &transaction.Account.Icon,
            &transaction.Account.IconColor,
            // Category
            &transaction.Category.ID,
            &transaction.Category.Name,
            &transaction.Category.Type,
            &transaction.Category.Icon,
            &transaction.Category.IconColor,
            // Destination Account (nullable)
            &destAccountID,
            &destAccountName,
            &destAccountType,
            &destAccountAmount,
            &destAccountIcon,
            &destAccountIconColor,
        )
        if err != nil {
            return err
        }

        // Populate internal ID fields for DB operations
        transaction.AccountID = int(transaction.Account.ID)
        transaction.CategoryID = int(transaction.Category.ID)

        // Populate destination account if present
        if destAccountID != nil {
            destAccID := int(*destAccountID)
            transaction.DestinationAccountID = &destAccID
            transaction.DestinationAccount = &TransactionAccountSchema{
                ID:        *destAccountID,
                Name:      *destAccountName,
                Type:      *destAccountType,
                Amount:    *destAccountAmount,
                Icon:      destAccountIcon,
                IconColor: destAccountIconColor,
            }
        }

        p.Items = append(p.Items, transaction)
    }
    return rows.Err()
}
```

### 5. Update Tests

Test mocks must match the new JOIN queries with all embedded columns.

**Example:** Test mock with embedded data

```go
func TestTransactionRepositoryGet(t *testing.T) {
    mock, err := pgxmock.NewPool()
    if err != nil {
        t.Fatal(err)
    }
    defer mock.Close()

    repo := NewTransactionRepository(mock)
    ctx := context.Background()

    t.Run("successfully gets transaction by id", func(t *testing.T) {
        now := time.Now()
        rows := pgxmock.NewRows([]string{
            "id", "type", "date", "amount", "note", "created_at", "updated_at", "deleted_at",
            "account_id", "account_name", "account_type", "account_amount", "account_icon", "account_icon_color",
            "category_id", "category_name", "category_type", "category_icon", "category_icon_color",
            "dest_account_id", "dest_account_name", "dest_account_type", "dest_account_amount", "dest_account_icon", "dest_account_icon_color",
        }).
            AddRow(1, "expense", now, 50000, nil, now, now, nil,
                1, "Cash", "expense", 100000, strPtr("wallet"), strPtr("#FF0000"),
                1, "Food", "expense", strPtr("food"), strPtr("#00FF00"),
                nil, nil, nil, nil, nil, nil)

        mock.ExpectQuery("SELECT.*FROM transactions t.*JOIN accounts a.*JOIN categories c").
            WithArgs(1).
            WillReturnRows(rows)

        transaction, err := repo.Get(ctx, 1)
        if err != nil {
            t.Fatalf("unexpected error: %v", err)
        }

        if transaction.ID != 1 {
            t.Errorf("expected ID 1, got %d", transaction.ID)
        }

        if transaction.Account.Name != "Cash" {
            t.Errorf("expected account name 'Cash', got %s", transaction.Account.Name)
        }
    })
}

// Helper function for string pointers in tests
func strPtr(s string) *string {
    return &s
}
```

**Key test updates:**

- Add helper function `strPtr()` for pointer values
- Include all embedded columns in mock row definition (26 columns for transactions)
- Use `strPtr()` for icon and iconColor fields
- Use `nil` for nullable destination account fields when not present
- Update assertions to verify embedded object fields

## Best Practices

### Schema Design

- **Minimize fields**: Only include what the frontend actually needs
- **Consistent naming**: Use `{ParentEntity}{RelatedEntity}Schema` pattern
- **Document fields**: Add Huma tags (doc, example, enum) for OpenAPI generation
- **Pointer types**: Use pointers for nullable fields to match database behavior

### SQL Queries

- **Explicit column selection**: Always list columns explicitly (never `SELECT *`)
- **Table prefixes required**: Always use table aliases/prefixes for column references to avoid ambiguity
  - ✅ `WHERE t.deleted_at IS NULL`
  - ❌ `WHERE deleted_at IS NULL` (ambiguous when multiple tables have deleted_at)
  - Apply to: WHERE clauses, ORDER BY clauses, and all column references
- **Soft delete checks**: Include `deleted_at IS NULL` in JOIN conditions with table prefix (e.g., `a.deleted_at IS NULL`)
- **LEFT JOIN for nullable**: Use LEFT JOIN for optional relationships
- **Index optimization**: Ensure foreign key columns are indexed

### Scanning & Population

- **Temporary variables**: Use temporary variables for nullable embedded objects
- **Conditional population**: Only create embedded objects when data is present
- **Internal ID sync**: Always populate internal ID fields from embedded object IDs
- **Error handling**: Return descriptive errors for scan failures

### Testing

- **Match column count**: Mock rows must have exact column count as query
- **Pointer helpers**: Use helper functions for creating pointer test data
- **Verify embedded data**: Assert on embedded object fields, not just parent fields
- **Test nullable cases**: Include tests for both present and absent nullable embedded objects

## Common Pitfalls & Solutions

### ❌ Pitfall 1: Ambiguous Column References

**Problem:**

```sql
-- ERROR: column reference "deleted_at" is ambiguous
WHERE deleted_at IS NULL
ORDER BY created_at DESC
```

Multiple tables in JOIN have the same column name (e.g., `deleted_at`, `created_at`, `type`).

**Solution:**

```go
// Add table prefix to ALL column references
qb.Add("t.deleted_at IS NULL")  // not "deleted_at IS NULL"
qb.AddInFilter("t.type", params.Type)  // not "type"
qb.AddInFilter("t.account_id", params.AccountIDs)  // not "account_id"

// In ORDER BY mapping
validColumns := map[string]string{
    "id":        "t.id",         // not "id"
    "createdAt": "t.created_at", // not "created_at"
}
```

### ❌ Pitfall 2: Scanning Wrong Type for Nullable Fields

**Problem:**

```go
// ERROR: cannot scan NULL into *string (expects string pointer, not string)
err := rows.Scan(&account.Icon)  // Icon is *string
```

**Solution:**

```go
// Declare temporary variables for nullable embedded fields
var destAccountIcon *string
err := rows.Scan(&destAccountIcon)  // Scan into pointer
transaction.DestinationAccount.Icon = destAccountIcon  // Assign pointer
```

### ❌ Pitfall 3: Forgetting to Populate Internal ID Fields

**Problem:**

```go
// Internal IDs are 0 (default value), breaking update operations
transaction.AccountID // returns 0
```

**Solution:**

```go
// Always populate internal ID fields after scanning embedded objects
transaction.AccountID = int(transaction.Account.ID)
transaction.CategoryID = int(transaction.Category.ID)
```

### ❌ Pitfall 4: Using Full Schema Instead of Lightweight Schema

**Problem:**

```go
// OpenAPI shows ALL account fields (createdAt, updatedAt, note, displayOrder, etc.)
type TransactionSchema struct {
    Account AccountSchema `json:"account"`  // Too much data!
}
```

**Solution:**

```go
// Create and use lightweight schema with only essential fields
type TransactionAccountSchema struct {
    ID        int64   `json:"id"`
    Name      string  `json:"name"`
    Type      string  `json:"type"`
    Amount    int64   `json:"amount"`
    Icon      *string `json:"icon,omitempty"`
    IconColor *string `json:"iconColor,omitempty"`
}

type TransactionSchema struct {
    Account TransactionAccountSchema `json:"account"`  // Minimal data
}
```

## Common Patterns

### Pattern 1: Required Single Relationship

Transaction → Account (always has one account)

```go
// Schema
type TransactionSchema struct {
    Account TransactionAccountSchema `json:"account"`
    AccountID int `json:"-"`
}

// SQL
JOIN accounts a ON t.account_id = a.id AND a.deleted_at IS NULL

// Scan
&transaction.Account.ID,
&transaction.Account.Name,
// ... more account fields

// Populate
transaction.AccountID = int(transaction.Account.ID)
```

### Pattern 2: Optional Single Relationship

Transaction → DestinationAccount (only for transfers)

```go
// Schema
type TransactionSchema struct {
    DestinationAccount *TransactionAccountSchema `json:"destinationAccount,omitempty"`
    DestinationAccountID *int `json:"-"`
}

// SQL
LEFT JOIN accounts da ON t.destination_account_id = da.id AND da.deleted_at IS NULL

// Scan
var destAccountID *int64
var destAccountName *string
// ... more temp variables

&destAccountID,
&destAccountName,
// ... more dest account fields

// Populate
if destAccountID != nil {
    destAccID := int(*destAccountID)
    transaction.DestinationAccountID = &destAccID
    transaction.DestinationAccount = &TransactionAccountSchema{
        ID: *destAccountID,
        Name: *destAccountName,
        // ... more fields
    }
}
```

### Pattern 3: Multiple Required Relationships

Transaction → Account + Category (always has both)

```go
// Schema
type TransactionSchema struct {
    Account TransactionAccountSchema `json:"account"`
    Category TransactionCategorySchema `json:"category"`
    AccountID int `json:"-"`
    CategoryID int `json:"-"`
}

// SQL
JOIN accounts a ON t.account_id = a.id AND a.deleted_at IS NULL
JOIN categories c ON t.category_id = c.id AND c.deleted_at IS NULL

// Scan
&transaction.Account.ID,
&transaction.Account.Name,
// ... more account fields
&transaction.Category.ID,
&transaction.Category.Name,
// ... more category fields

// Populate
transaction.AccountID = int(transaction.Account.ID)
transaction.CategoryID = int(transaction.Category.ID)
```

## Performance Considerations

**Pros:**

- ✅ Eliminates N+1 queries (single query vs N+1 queries)
- ✅ Reduces API round-trips (1 request vs multiple requests)
- ✅ Smaller response payloads (only essential fields)
- ✅ Database-level JOIN optimization

**Cons:**

- ⚠️ Slightly more complex queries
- ⚠️ More columns to scan (but still faster than multiple queries)

**When to use:**

- Frontend always needs the related data
- Related entity has a stable, small set of essential fields
- List/pagination endpoints where N+1 would be problematic

**When NOT to use:**

- Related data rarely needed
- Related entity is very large or complex
- Need full CRUD operations on related entity (use dedicated endpoints)

## Migration Checklist

When adding embedded data to an existing entity:

- [ ] Create lightweight schema type(s) for embedded data
- [ ] Update parent schema to use lightweight types
- [ ] Keep internal ID fields with `json:"-"` tag
- [ ] Update repository Get() with JOIN query
- [ ] Update repository List() with JOIN query
- [ ] Update PaginatedSchema.FromRows() to scan embedded columns
- [ ] Populate internal ID fields in both Get() and FromRows()
- [ ] Add strPtr() helper to test file
- [ ] Update all test mocks with embedded columns
- [ ] Update test assertions to verify embedded fields
- [ ] Update documentation with response examples
- [ ] Verify OpenAPI schema reflects lightweight types

## Examples in Codebase

**Transaction → Account + Category:**

- Schema: `internal/database/schemas/transaction_schema.go`
- Repository: `internal/repositories/transaction_repository.go`
- Tests: `internal/repositories/transaction_repository_test.go`
- Docs: `docs/transaction_service.md`

**Future implementations:**

- Budget → Template + Accounts
- Tag → Transactions count
- Relation → Parent/Child transactions

## Quick Reference

```bash
# Create lightweight schema
type {Parent}{Related}Schema struct { /* essential fields only */ }

# Update parent schema
type {Parent}Schema struct {
    {Related} {Parent}{Related}Schema `json:"{related}"`
    {Related}ID int `json:"-"` // internal
}

# Repository JOIN
JOIN {related_table} r ON p.{related}_id = r.id AND r.deleted_at IS NULL

# Scan embedded
&parent.{Related}.ID,
&parent.{Related}.Name,
// ... more fields

# Populate internal ID
parent.{Related}ID = int(parent.{Related}.ID)

# Test helper
func strPtr(s string) *string { return &s }

# Test mock
rows := pgxmock.NewRows([]string{
    "parent_id", /* ... */,
    "related_id", "related_name", /* ... */
}).AddRow(1, /* ... */, 1, "Name", /* ... */)
```

For questions or improvements to this pattern, refer to `docs/code_standards.md` and `docs/testing_standards.md`.
