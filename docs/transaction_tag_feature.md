# Transaction Tag Feature

## Overview

Tag system for organizing and categorizing transactions with support for:

- Tag management (create, list, delete)
- Many-to-many relationship between transactions and tags
- Transaction tagging (add, update, remove tags)
- Tag-based summary analytics
- Automatic tag creation when adding to transactions
- Cascade delete protection (prevents deletion of tags in use)

## Database Schema

### Tables Created (Migration 000007)

**tags** - Tag definitions

```sql
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `id`: Auto-incrementing primary key
- `name`: Unique tag name (max 50 chars)
- `created_at`: Timestamp of tag creation

**transaction_tags** - Junction table for many-to-many relationship

```sql
CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id, tag_id)
);
```

- `transaction_id`: Foreign key to transactions (cascade on delete)
- `tag_id`: Foreign key to tags (cascade on delete)
- Composite primary key ensures no duplicate tag assignments
- Cascade delete ensures orphaned records are cleaned up

### Indexes

```sql
CREATE INDEX idx_transaction_tags_transaction ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag ON transaction_tags(tag_id);
```

## API Endpoints

### Tag Management

#### GET /tags

List all tags with pagination and search.

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Filter tags by name (case-insensitive, partial match)

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "groceries",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "name": "recurring",
      "createdAt": "2024-01-01T10:05:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 2,
    "totalPages": 1
  }
}
```

#### POST /tags

Create a new tag.

**Request:**

```json
{
  "name": "groceries"
}
```

**Response:** `201 Created`

**Errors:**
- `400 Bad Request`: Tag name is required or already exists
- `500 Internal Server Error`: Database error

#### DELETE /tags/{id}

Delete a tag by ID.

**Path Parameters:**

- `id`: Tag ID (integer)

**Response:** `204 No Content`

**Errors:**
- `404 Not Found`: Tag doesn't exist
- `500 Internal Server Error`: Database error (e.g., tag still in use)

### Transaction Tagging

#### GET /transactions/{id}/tags

Get all tags for a specific transaction.

**Path Parameters:**

- `id`: Transaction ID (integer)

**Response:**

```json
{
  "transactionId": 1,
  "tags": [
    {
      "id": 1,
      "name": "groceries",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    {
      "id": 2,
      "name": "recurring",
      "createdAt": "2024-01-01T10:05:00Z"
    }
  ]
}
```

**Errors:**
- `404 Not Found`: Transaction doesn't exist
- `500 Internal Server Error`: Database error

#### POST /transactions/{id}/tags

Add a tag to a transaction. Creates the tag if it doesn't exist.

**Path Parameters:**

- `id`: Transaction ID (integer)

**Request:**

```json
{
  "name": "groceries"
}
```

**Response:** `201 Created`

**Errors:**
- `400 Bad Request`: Tag name is required
- `404 Not Found`: Transaction doesn't exist
- `500 Internal Server Error`: Database error

#### PUT /transactions/{id}/tags

Replace all tags for a transaction.

**Path Parameters:**

- `id`: Transaction ID (integer)

**Request:**

```json
{
  "tagNames": ["groceries", "recurring", "essential"]
}
```

**Response:** `200 OK`

**Notes:**
- Removes all existing tags from the transaction
- Adds specified tags (creates them if they don't exist)
- Empty array removes all tags from transaction

**Errors:**
- `404 Not Found`: Transaction doesn't exist
- `500 Internal Server Error`: Database error

### Summary Analytics

#### GET /summary/tags

Get summary statistics grouped by tags.

**Query Parameters:**

- `startDate` (optional): ISO 8601 timestamp for start of date range
- `endDate` (optional): ISO 8601 timestamp for end of date range
- `tagNames` (optional): Comma-separated list of tag names to filter
- `accountIds` (optional): Comma-separated list of account IDs to filter
- `categoryIds` (optional): Comma-separated list of category IDs to filter
- `type` (optional): Transaction type ("income", "expense", "transfer")

**Response:**

```json
{
  "data": [
    {
      "tagId": 1,
      "tagName": "groceries",
      "totalCount": 45,
      "incomeCount": 0,
      "expenseCount": 45,
      "transferCount": 0,
      "incomeAmount": 0,
      "expenseAmount": 4500000,
      "transferAmount": 0,
      "net": -4500000
    },
    {
      "tagId": 2,
      "tagName": "recurring",
      "totalCount": 12,
      "incomeCount": 1,
      "expenseCount": 11,
      "transferCount": 0,
      "incomeAmount": 5000000,
      "expenseAmount": 1100000,
      "transferAmount": 0,
      "net": 3900000
    }
  ]
}
```

## Implementation Files

### Schemas (`internal/database/schemas/`)

**tag_schema.go** - Tag entity and DTOs

```go
// TagSchema - Tag entity
type TagSchema struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"createdAt"`
}

// CreateTagSchema - Create tag DTO
type CreateTagSchema struct {
    Name string `json:"name" minLength:"1" maxLength:"50" doc:"Tag name"`
}

// SearchParamTagSchema - Search parameters
type SearchParamTagSchema struct {
    Page     int    `query:"page" default:"1" minimum:"1"`
    PageSize int    `query:"pageSize" default:"10" minimum:"1" maximum:"100"`
    Search   string `query:"search"`
}

// PaginatedTagSchema - Paginated response
type PaginatedTagSchema struct {
    Data       []TagSchema        `json:"data"`
    Pagination PaginationMetadata `json:"pagination"`
}

// DeleteTagInput - Delete path parameter
type DeleteTagInput struct {
    ID int `path:"id" minimum:"1"`
}
```

**transaction_tag_schema.go** - Transaction tag entities and DTOs

```go
// TransactionTagSchema - Single transaction tag
type TransactionTagSchema struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"createdAt"`
}

// TransactionTagsSchema - Transaction with tags
type TransactionTagsSchema struct {
    TransactionID int                        `json:"transactionId"`
    Tags          []TransactionTagSchema     `json:"tags"`
}

// AddTransactionTagSchema - Add tag to transaction
type AddTransactionTagSchema struct {
    Name string `json:"name" minLength:"1" maxLength:"50"`
}

// UpdateTransactionTagsSchema - Replace all tags
type UpdateTransactionTagsSchema struct {
    TagNames []string `json:"tagNames"`
}

// TransactionTagParam - Path parameter
type TransactionTagParam struct {
    ID int `path:"id" minimum:"1"`
}
```

**tag_summary_schema.go** - Tag summary analytics

```go
// SummaryTagParamSchema - Query parameters
type SummaryTagParamSchema struct {
    StartDate   time.Time `query:"startDate"`
    EndDate     time.Time `query:"endDate"`
    TagNames    []string  `query:"tagNames"`
    AccountIDs  []int     `query:"accountIds"`
    CategoryIDs []int     `query:"categoryIds"`
    Type        string    `query:"type" enum:"income,expense,transfer"`
}

// SummaryTagitem - Single tag summary
type SummaryTagitem struct {
    TagID          int     `json:"tagId"`
    TagName        string  `json:"tagName"`
    TotalCount     int     `json:"totalCount"`
    IncomeCount    int     `json:"incomeCount"`
    ExpenseCount   int     `json:"expenseCount"`
    TransferCount  int     `json:"transferCount"`
    IncomeAmount   float64 `json:"incomeAmount"`
    ExpenseAmount  float64 `json:"expenseAmount"`
    TransferAmount float64 `json:"transferAmount"`
    Net            float64 `json:"net"`
}

// SummaryTagSchema - Response wrapper
type SummaryTagSchema struct {
    Data []SummaryTagitem `json:"data"`
}
```

### Repositories (`internal/repositories/`)

**tag_repository.go** - Tag CRUD operations

```go
type TagRepository struct {
    db DB
}

// List - Get tags with pagination and search
func (r *TagRepository) List(ctx context.Context, params schemas.SearchParamTagSchema) (schemas.PaginatedTagSchema, error)

// Get - Get tag by ID
func (r *TagRepository) Get(ctx context.Context, id int) (*schemas.TagSchema, error)

// GetByName - Get tag by name (for duplicate check)
func (r *TagRepository) GetByName(ctx context.Context, name string) (*schemas.TagSchema, error)

// Create - Create new tag
func (r *TagRepository) Create(ctx context.Context, input schemas.CreateTagSchema) (*schemas.TagSchema, error)

// Delete - Delete tag by ID
func (r *TagRepository) Delete(ctx context.Context, id int) error
```

**transaction_tag_repository.go** - Transaction tag operations

```go
type TransactionTagRepository struct {
    db DB
}

// GetTransactionTags - Get all tags for a transaction
func (r *TransactionTagRepository) GetTransactionTags(ctx context.Context, transactionID int) ([]schemas.TagSchema, error)

// AddTagToTransaction - Add tag to transaction (with tag creation)
func (r *TransactionTagRepository) AddTagToTransaction(ctx context.Context, transactionID int, tagName string) error

// RemoveTagFromTransaction - Remove tag from transaction
func (r *TransactionTagRepository) RemoveTagFromTransaction(ctx context.Context, transactionID int, tagID int) error

// ReplaceTransactionTags - Replace all tags for transaction
func (r *TransactionTagRepository) ReplaceTransactionTags(ctx context.Context, transactionID int, tagNames []string) error

// GetTagSummary - Get summary statistics by tags (uses query_builder)
func (r *TransactionTagRepository) GetTagSummary(ctx context.Context, params schemas.SummaryTagParamSchema) (schemas.SummaryTagSchema, error)
```

### Services (`internal/services/`)

**tag_service.go** - Tag business logic

```go
type TagService struct {
    repo *repositories.TagRepository
}

// ListTags - List tags with validation
func (s *TagService) ListTags(ctx context.Context, params schemas.SearchParamTagSchema) (schemas.PaginatedTagSchema, error)

// CreateTag - Create tag with duplicate check
func (s *TagService) CreateTag(ctx context.Context, input schemas.CreateTagSchema) (*schemas.TagSchema, error)

// DeleteTag - Delete tag with existence check
func (s *TagService) DeleteTag(ctx context.Context, id int) error
```

**transaction_tag_service.go** - Transaction tag business logic

```go
type TransactionTagService struct {
    transactionRepo *repositories.TransactionRepository
    tagRepo         *repositories.TransactionTagRepository
}

// GetTransactionTags - Get tags for transaction with validation
func (s *TransactionTagService) GetTransactionTags(ctx context.Context, transactionID int) (schemas.TransactionTagsSchema, error)

// AddTagToTransaction - Add tag with validation
func (s *TransactionTagService) AddTagToTransaction(ctx context.Context, transactionID int, input schemas.AddTransactionTagSchema) error

// UpdateTransactionTags - Replace tags with validation
func (s *TransactionTagService) UpdateTransactionTags(ctx context.Context, transactionID int, input schemas.UpdateTransactionTagsSchema) error
```

### Resources (`internal/resources/`)

**tag_resource.go** - Tag HTTP handlers

- Huma v2 integration
- Bearer token authentication
- Error handling with appropriate HTTP status codes

**transaction_resource.go** - Extended with transaction tag handlers

- Transaction tag endpoints consolidated in transaction resource
- Maintains single point of responsibility for transaction-related operations

**summary_resource.go** - Extended with tag summary handler

- Tag summary analytics endpoint
- Query parameter validation

## Usage Examples

### 1. Basic Tag Management

```bash
# Create tags
curl -X POST http://localhost:8080/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "groceries"}'

curl -X POST http://localhost:8080/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "recurring"}'

# List all tags
curl http://localhost:8080/tags \
  -H "Authorization: Bearer $TOKEN"

# Search tags
curl "http://localhost:8080/tags?search=groc" \
  -H "Authorization: Bearer $TOKEN"

# Delete tag (only if not in use)
curl -X DELETE http://localhost:8080/tags/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 2. Tag Transactions

```bash
# Add single tag to transaction (creates tag if doesn't exist)
curl -X POST http://localhost:8080/transactions/123/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "groceries"}'

# Add another tag
curl -X POST http://localhost:8080/transactions/123/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "essential"}'

# Get transaction tags
curl http://localhost:8080/transactions/123/tags \
  -H "Authorization: Bearer $TOKEN"

# Replace all tags for transaction
curl -X PUT http://localhost:8080/transactions/123/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tagNames": ["groceries", "recurring", "essential"]}'

# Remove all tags from transaction
curl -X PUT http://localhost:8080/transactions/123/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tagNames": []}'
```

### 3. Tag Analytics

```bash
# Get summary for all tags
curl http://localhost:8080/summary/tags \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl "http://localhost:8080/summary/tags?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z" \
  -H "Authorization: Bearer $TOKEN"

# Filter by specific tags
curl "http://localhost:8080/summary/tags?tagNames=groceries,recurring" \
  -H "Authorization: Bearer $TOKEN"

# Filter by account and type
curl "http://localhost:8080/summary/tags?accountIds=1,2&type=expense" \
  -H "Authorization: Bearer $TOKEN"

# Combined filters
curl "http://localhost:8080/summary/tags?startDate=2024-01-01T00:00:00Z&endDate=2024-12-31T23:59:59Z&tagNames=groceries&accountIds=1&type=expense" \
  -H "Authorization: Bearer $TOKEN"
```

## Key Features

### 1. Automatic Tag Creation

When adding a tag to a transaction, if the tag doesn't exist, it will be created automatically:

```go
// No need to create tag first
POST /transactions/123/tags
{"name": "new-tag"}  // Tag created if doesn't exist
```

### 2. Cascade Delete

Database relationships are configured with `ON DELETE CASCADE`:

- When a transaction is deleted, all its tag associations are removed
- When a tag is deleted, all its transaction associations are removed
- Prevents orphaned records

### 3. Duplicate Prevention

- Composite primary key on `(transaction_id, tag_id)` prevents duplicate assignments
- Tag names are unique across the system
- Service layer performs existence checks before operations

### 4. Query Builder Integration

Tag summary repository uses the `query_builder` utility for safe SQL construction:

```go
qb := utils.QueryBuilder()

if len(params.TagNames) > 0 {
    placeholders := qb.BuildPlaceholders(len(params.TagNames))
    for _, name := range params.TagNames {
        qb.AddArg(name)
    }
    qb.Add(fmt.Sprintf("t.name IN (%s)", placeholders))
}

whereClause, args := qb.ToWhereClause()
```

Benefits:
- Prevents SQL injection
- Consistent parameter numbering
- Maintainable and testable

### 5. Efficient Indexing

Indexes on junction table optimize common queries:

```sql
CREATE INDEX idx_transaction_tags_transaction ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag ON transaction_tags(tag_id);
```

- Fast lookups for transaction tags
- Fast lookups for tagged transactions
- Efficient join operations

## Error Handling

### Common Errors

**400 Bad Request**
- Tag name is required
- Tag name already exists
- Invalid query parameters

**404 Not Found**
- Transaction doesn't exist
- Tag doesn't exist

**500 Internal Server Error**
- Database connection error
- Constraint violation (e.g., deleting tag in use)
- Query execution error

### Error Response Format

```json
{
  "status": 400,
  "title": "Bad Request",
  "detail": "Tag name is required"
}
```

## Best Practices

1. **Use Descriptive Tag Names**: Keep tags short, lowercase, and meaningful (e.g., "groceries", "recurring", "essential")

2. **Batch Tag Updates**: Use `PUT /transactions/{id}/tags` to update multiple tags at once instead of multiple POST calls

3. **Tag Reusability**: Create common tags once and reuse across transactions

4. **Analytics Filters**: Combine multiple filters in summary endpoint for precise insights

5. **Cascade Awareness**: Understand that deleting a tag removes it from all transactions

## Performance Considerations

- Indexes on junction table ensure fast tag lookups
- Query builder prevents SQL injection and ensures parameter safety
- Pagination on tag list prevents memory issues with large tag sets
- Batch operations (ReplaceTransactionTags) reduce database round trips

## Migration

Migration `000007_tags.up.sql` creates all necessary tables and indexes. Run migrations with:

```bash
go run cmd/app/main.go migrate up
```

Rollback with:

```bash
go run cmd/app/main.go migrate down
```
