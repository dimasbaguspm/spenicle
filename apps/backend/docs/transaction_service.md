# Transaction Service — Summary

Purpose: manage transaction CRUD with account/category relations, type validation, and automatic account balance synchronization.

Where to look

- Resource: `internal/resources/transaction_resource.go`
- Service: `internal/services/transaction_service.go`
- Repository: `internal/repositories/transaction_repository.go`
- Schemas: `internal/database/schemas/`

Core endpoints (JWT protected)

- GET /transactions — paginated list (filters via `SearchParamTransactionSchema`: type, accountIds, categoryIds, tagIds, startDate, endDate, minAmount, maxAmount)
  - Returns transactions with embedded account/category objects and tags array (no separate requests needed)
  - Uses SQL JOINs to fetch account and category data in single query
  - Tag filter: returns transactions that have at least one of the specified tag IDs
- POST /transactions — create (`CreateTransactionSchema`) → 201 + account balance update
- GET /transactions/{id} — retrieve by id → 200 or 404
  - Returns transaction with embedded account/category objects
- PATCH /transactions/{id} — partial update (`UpdateTransactionSchema`) → 200 + account balance sync
- DELETE /transactions/{id} — soft delete → 204 + account balance revert

Response format

Transaction responses include embedded objects with essential fields only:

```json
{
  "id": 1,
  "type": "expense",
  "date": "2026-01-01T00:00:00Z",
  "amount": 50000,
  "account": {
    "id": 1,
    "name": "Cash",
    "type": "expense",
    "amount": 100000,
    "icon": "wallet",
    "iconColor": "#FF0000"
  },
  "category": {
    "id": 1,
    "name": "Food",
    "type": "expense",
    "icon": "food",
    "iconColor": "#00FF00"
  },
  "destinationAccount": null,
  "tags": [
    {
      "id": 1,
      "name": "groceries"
    },
    {
      "id": 2,
      "name": "recurring"
    }
  ],
  "note": "Groceries",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

Note: Embedded objects contain only basic information to minimize response size. For full account/category details, use the dedicated account/category endpoints.

**Implementation details:** See `docs/embedded_data_pattern.md` for comprehensive guide on embedded data structure and fetching patterns.

Validation & errors

- Schema-level validation: Huma tags on DTOs → 422
- Business validation (service layer):
  - Transaction type must match category type (expense→expense, income→income, transfer→transfer) → 422
  - Expense transactions can only use expense or income account types → 422
  - Transfer transactions require destination account (cannot be same as source account) → 400
  - Account/category must exist → 404
  - Destination account must exist (for transfers) → 404
  - At least one field to update → 400
- Not found: repository/service → 404

DB notes

- Repositories accept a small `DB` interface for testability and use `RETURNING`/`COALESCE` patterns.
- Soft delete implemented via `deleted_at` timestamp.
- Transaction types: `expense`, `income`, `transfer` (must match category type)
- Transfer transactions require `destination_account_id` field (nullable, only for transfers)
- **Embedded data fetching**: List and Get operations use SQL JOINs to fetch account/category data and JSON_AGG for tags
  - Single query retrieves transaction + account + category + destination account (if applicable) + tags array
  - Eliminates N+1 query problem for paginated lists
  - Repository scans 27 columns: transaction (9 with tags JSON) + account (6) + category (5) + destination account (6, nullable) + tags (1, JSON array)
  - Tags are fetched using `JSON_AGG(JSON_BUILD_OBJECT('id', tg.id, 'name', tg.name))` from junction table
  - Tags array is empty `[]` if transaction has no tags
  - Internal ID fields (`account_id`, `category_id`, `destination_account_id`) are populated for DB operations but hidden from JSON responses
- Account balance sync:
  - CREATE: adds/subtracts amount from account based on transaction type
  - UPDATE: reverts old effect, applies new effect (handles account/amount/destination changes)
  - DELETE: reverts transaction effect on account balance
  - TRANSFER: deducts from source account, adds to destination account

Account balance logic

- **Income transaction**: adds amount to account balance
- **Expense transaction**: subtracts amount from account balance
- **Transfer transaction**: deducts from source account (`account_id`), adds to destination account (`destination_account_id`)

Type constraints

- Expense transaction → expense category + (expense OR income account)
- Income transaction → income category + any account type
- Transfer transaction → transfer category + any account types (source and destination can be any type)
- Transfer requires both source and destination accounts, and they must be different

Schema structure

- **TransactionSchema**: full entity with timestamps and embedded account/category objects
  - Contains internal fields: `account_id`, `category_id`, `destination_account_id` (hidden from JSON with `json:"-"`)
  - Embedded objects for easier frontend consumption:
    - `account`: `TransactionAccountSchema` (id, name, type, amount, icon, iconColor)
    - `category`: `TransactionCategorySchema` (id, name, type, icon, iconColor)
    - `destinationAccount`: `*TransactionAccountSchema` (nullable, same fields as account)
- **TransactionAccountSchema**: lightweight account representation in transaction responses
  - Fields: id, name, type, amount, icon (optional), iconColor (optional)
  - Used for `account` and `destinationAccount` fields in TransactionSchema
  - Omits metadata fields like createdAt, updatedAt, note, displayOrder, archivedAt
- **TransactionCategorySchema**: lightweight category representation in transaction responses
  - Fields: id, name, type, icon (optional), iconColor (optional)
  - Used for `category` field in TransactionSchema
  - Omits metadata fields like createdAt, updatedAt, note, displayOrder, archivedAt
- **CreateTransactionSchema**: type (required), date (optional, defaults to now), amount (required), account_id (required), category_id (required), note (optional)
- **UpdateTransactionSchema**: all fields optional (partial update) - updates trigger account balance sync if amount/account changed
- **SearchParamTransactionSchema**: pagination + filters (type, accountIds, destinationAccountIds, categoryIds, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder, pageNumber, pageSize)
- **PaginatedTransactionSchema**: wrapper with pagination metadata + items array

Quick commands

```bash
go test ./internal/services -v -run TestTransaction
go test ./internal/repositories -v -run TestTransaction
go test ./internal/resources -v -run TestTransaction
go test ./internal/database/schemas -v -run TestTransaction
```

For full details and examples, see the schema files in `internal/database/schemas/transaction_*.go` and `docs/testing_standards.md`.

Note: Account balance updates are currently performed as separate database calls. In production, these should be wrapped in database transactions to ensure atomicity.
