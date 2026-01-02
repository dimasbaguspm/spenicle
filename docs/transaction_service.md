# Transaction Service — Summary

Purpose: manage transaction CRUD with account/category relations, type validation, and automatic account balance synchronization.

Where to look

- Resource: `internal/resources/transaction_resource.go`
- Service: `internal/services/transaction_service.go`
- Repository: `internal/repositories/transaction_repository.go`
- Schemas: `internal/database/schemas/`

Core endpoints (JWT protected)

- GET /transactions — paginated list (filters via `SearchParamTransactionSchema`: type, account_id, category_id)
- POST /transactions — create (`CreateTransactionSchema`) → 201 + account balance update
- GET /transactions/{id} — retrieve by id → 200 or 404
- PATCH /transactions/{id} — partial update (`UpdateTransactionSchema`) → 200 + account balance sync
- DELETE /transactions/{id} — soft delete → 204 + account balance revert

Validation & errors

- Schema-level validation: Huma tags on DTOs → 422
- Business validation (service layer):
  - Transaction type must match category type (expense→expense, income→income, transfer→transfer) → 422
  - Expense transactions can only use expense or income account types → 422
  - Account/category must exist → 404
  - At least one field to update → 400
- Not found: repository/service → 404

DB notes

- Repositories accept a small `DB` interface for testability and use `RETURNING`/`COALESCE` patterns.
- Soft delete implemented via `deleted_at` timestamp.
- Transaction types: `expense`, `income`, `transfer` (must match category type)
- Account balance sync:
  - CREATE: adds/subtracts amount from account based on transaction type
  - UPDATE: reverts old effect, applies new effect (handles account/amount changes)
  - DELETE: reverts transaction effect on account balance

Account balance logic

- **Income transaction**: adds amount to account balance
- **Expense transaction**: subtracts amount from account balance
- **Transfer transaction**: currently returns 0 delta (placeholder for future two-account logic)

Type constraints

- Expense transaction → expense category + (expense OR income account)
- Income transaction → income category + any account type
- Transfer transaction → transfer category

Schema structure

- **TransactionSchema**: full entity with timestamps, account_id, category_id
- **CreateTransactionSchema**: type (required), date (optional, defaults to now), amount (required), account_id (required), category_id (required), note (optional)
- **UpdateTransactionSchema**: all fields optional (partial update) - updates trigger account balance sync if amount/account changed
- **SearchParamTransactionSchema**: pagination + filters (type, account_id, category_id, orderBy, orderDirection)
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
