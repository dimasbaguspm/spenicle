# Summary Service — Summary

Purpose: provide aggregated transaction summaries grouped by time period, account, or category with optional date filtering.

Where to look

- Resource: `internal/resources/summary_resource.go`
- Service: `internal/services/summary_service.go`
- Repository: `internal/repositories/summary_repository.go`
- Schemas: `internal/database/schemas/summary_*_schema.go`

Core endpoints (JWT protected)

- GET /summary/transactions — transaction summary grouped by frequency (daily, weekly, monthly, yearly)
- GET /summary/accounts — transaction summary grouped by account
- GET /summary/categories — transaction summary grouped by category

Query parameters

- `startDate` (required): Start date for filtering (ISO 8601 format, e.g., `2024-01-01T00:00:00Z`)
- `endDate` (required): End date for filtering (ISO 8601 format, e.g., `2024-12-31T23:59:59Z`)
- `frequency` (transaction only): Grouping frequency — `daily`, `weekly`, `monthly` (default), `yearly`

Response schemas

**Transaction Summary** (`SummaryTransactionSchema`):

```json
{
  "frequency": "monthly",
  "data": [
    {
      "period": "2024-01",
      "totalCount": 100,
      "incomeCount": 25,
      "expenseCount": 70,
      "transferCount": 5,
      "incomeAmount": 5000000,
      "expenseAmount": 3000000,
      "transferAmount": 500000,
      "net": 2000000
    }
  ]
}
```

**Account Summary** (`SummaryAccountSchema`):

```json
{
  "data": [
    {
      "accountId": 1,
      "accountName": "Cash",
      "accountType": "expense",
      "totalCount": 50,
      "incomeAmount": 2000000,
      "expenseAmount": 1500000,
      "net": 500000
    }
  ]
}
```

**Category Summary** (`SummaryCategorySchema`):

```json
{
  "data": [
    {
      "categoryId": 1,
      "categoryName": "Food",
      "categoryType": "expense",
      "totalCount": 75,
      "incomeAmount": 0,
      "expenseAmount": 1500000,
      "net": -1500000
    }
  ]
}
```

Validation & errors

- Schema-level validation: Huma tags on query params → 422
- Service-level errors → 500

DB notes

- Efficient SQL aggregation with `GROUP BY` and date functions
- Uses `CASE WHEN` for conditional aggregations
- Date filtering applied via `WHERE` clauses with required `startDate`/`endDate` parameters
- Transaction summary supports dynamic date truncation based on frequency parameter
- **Period filling**: All endpoints fill missing periods with zero values
  - Generates complete period sequence between startDate and endDate using `utils.GeneratePeriods()`
  - Periods without transactions return zero counts and amounts
  - Ensures consistent data visualization and trend analysis
  - Maintains DESC order (most recent periods first)

Service features

- Default frequency: `monthly` (if not specified)
- Concurrent execution: `GetAllSummaries` runs all three summary queries using goroutines
- All endpoints filter by user context (JWT-protected)

Naming convention

All types follow `Summary*` prefix pattern:

- `SummaryTransactionItem`, `SummaryTransactionSchema`
- `SummaryAccountItem`, `SummaryAccountSchema`
- `SummaryCategoryItem`, `SummaryCategorySchema`

Quick commands

```bash
go test ./internal/resources -v -run TestSummaryResource  # test resource layer
go test ./internal/services -v -run TestSummaryService    # test service layer
gofmt -w .
```

For full details and examples, see the schema files in `internal/database/schemas/summary_*_schema.go` and `docs/testing_standards.md`.
