# Transaction Tag Feature

## Overview

Tag system for organizing transactions with many-to-many relationships, automatic tag creation, and tag-based analytics.

## Database Schema (Migration 000007)

**tags**: `id`, `name` (unique), `created_at`  
**transaction_tags**: Junction table with `(transaction_id, tag_id)` as composite PK, cascade delete  
**indexes**: `idx_transaction_tags_transaction`, `idx_transaction_tags_tag`

## API Endpoints

### Tag Management

- `GET /tags` - List tags (pagination: pageNumber, pageSize; filter: search)
- `POST /tags` - Create tag (body: `{name}`)
- `DELETE /tags/{id}` - Delete tag

### Transaction Tagging

- `GET /transactions/{id}/tags` - Get transaction tags
- `POST /transactions/{id}/tags` - Add tag (creates if doesn't exist, body: `{name}`)
- `PUT /transactions/{id}/tags` - Replace all tags (body: `{tagNames: []}`)

### Analytics

- `GET /summary/tags` - Tag summary with filters (startDate, endDate, tagNames, accountIds, categoryIds, type)

**Response structure:**

```json
{
  "data": [
    {
      "tagId": 1,
      "tagName": "groceries",
      "totalCount": 45,
      "incomeCount": 0,
      "expenseCount": 45,
      "incomeAmount": 0,
      "expenseAmount": 4500000,
      "net": -4500000
    }
  ]
}
```

## Implementation

**Schemas**: `tag_schema.go`, `transaction_tag_schema.go`, `tag_summary_schema.go`  
**Repositories**: `tag_repository.go`, `transaction_tag_repository.go` (uses query_builder)  
**Services**: `tag_service.go`, `transaction_tag_service.go`  
**Resources**: `tag_resource.go`, transaction tag handlers in `transaction_resource.go`

## Key Features

- **Embedded Tags in Transactions**: Transaction responses include tags array with id/name (no separate request needed)
- **Tag Filtering**: Filter transactions by tag IDs via `tagIds` query parameter in GET /transactions
- **Automatic Tag Creation**: Adding non-existent tag to transaction creates it
- **Cascade Delete**: Deleting transaction/tag removes associations
- **Duplicate Prevention**: Composite PK prevents duplicate tag assignments
- **Query Builder**: Safe SQL construction with parameterized queries
- **Efficient Indexing**: Fast lookups on junction table

## Usage Examples

```bash
# Filter transactions by tags (returns transactions with at least one of the specified tag IDs)
curl "/transactions?tagIds=1,2" -H "Authorization: Bearer $TOKEN"

# Create and assign tag
curl -X POST /transactions/123/tags -d '{"name": "groceries"}' -H "Authorization: Bearer $TOKEN"

# Replace all tags
curl -X PUT /transactions/123/tags -d '{"tagNames": ["groceries", "recurring"]}' -H "Authorization: Bearer $TOKEN"

# Get tag analytics
curl "/summary/tags?tagNames=groceries&type=expense" -H "Authorization: Bearer $TOKEN"
```
