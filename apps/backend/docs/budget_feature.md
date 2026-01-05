# Budget Feature Implementation

## Overview

Comprehensive budget tracking system with support for:

- One-time and recurring budgets (weekly, monthly, yearly)
- Budget templates for automatic budget generation
- Filtering by account and/or category
- Real-time actual amount calculation (computed from transactions)
- Background worker for automatic budget creation

## Database Schema

### Tables Created (Migration 000004)

1. **budget_templates** - Recurring budget configurations

   - Links to accounts and/or categories
   - Recurrence patterns: none, weekly, monthly, yearly
   - Start/end dates for recurrence period

2. **budgets** - Actual budget periods
   - Generated from templates or created manually
   - Tracks period_start, period_end, amount_limit
   - **actual_amount is computed on-the-fly** (not stored in database)
   - Calculation: SUM(transactions) filtered by period, account, and category

## API Endpoints

### Budget Templates (under /budgets namespace)

- `GET /budgets/templates` - List templates (paginated, filterable)
- `POST /budgets/templates` - Create template
- `GET /budgets/templates/{id}` - Get template details
- `PATCH /budgets/templates/{id}` - Update template
- `DELETE /budgets/templates/{id}` - Soft delete template

### Budgets

- `GET /budgets` - List budgets (paginated, filterable)
- `POST /budgets` - Create budget
- `GET /budgets/{id}` - Get budget details
- `PATCH /budgets/{id}` - Update budget
- `DELETE /budgets/{id}` - Soft delete budget

### Nested Routes (in parent resources)

- `GET /accounts/{id}/budgets` - List budgets for specific account
- `GET /accounts/{id}/budgets/{budgetId}` - Get specific budget for account
- `GET /categories/{id}/budgets` - List budgets for specific category
- `GET /categories/{id}/budgets/{budgetId}` - Get specific budget for category

## Implementation Files

### Schemas (`internal/database/schemas/`)

- `budget_template_schema.go` - Budget template entity
- `budget_template_create_schema.go` - Create DTO with validation
- `budget_template_update_schema.go` - Update DTO
- `budget_template_search_param_schema.go` - Search/filter parameters
- `budget_template_paginated_schema.go` - Paginated response
- `budget_schema.go` - Budget entity
- `budget_create_schema.go` - Create DTO with validation
- `budget_update_schema.go` - Update DTO
- `budget_search_param_schema.go` - Search/filter parameters
- `budget_paginated_schema.go` - Paginated response

### Repositories (`internal/repositories/`)

- `budget_template_repository.go` - CRUD for templates
- `budget_repository.go` - CRUD for budgets + calculation logic

### Services (`internal/services/`)

- `budget_template_service.go` - Business logic for templates
- `budget_service.go` - Business logic for budgets (actual_amount auto-calculated)

### Resources (`internal/resources/`)

- `budget_resource.go` - Unified HTTP handlers for budgets and templates
- `account_resource.go` - Extended with nested budget routes
- `category_resource.go` - Extended with nested budget routes

### Worker (`internal/worker/`)

- `worker.go` - Background job system with scheduling
  - Job interface for schedulable tasks
  - Worker manages multiple jobs with independent goroutines
  - Schedule format: "HH:MM" (24-hour format)
  - Graceful shutdown support
- `budget_worker.go` - Automatic budget generation from templates
  - Runs daily at midnight (00:00)
  - Fetches active templates (recurrence != 'none')
  - Calculates next period based on recurrence (weekly, monthly, yearly)
  - Idempotent: checks for duplicates before creating
  - Logs success, skip, and error counts

### Main Application (`cmd/app/`)

- Worker automatically starts with the application
- Stops gracefully on shutdown signal

## Key Features

### 1. Flexible Budget Targeting

Budgets can target:

- Specific account only
- Specific category only
- Both account AND category
- At least one must be specified (enforced by constraint)

### 2. Recurring Budget Templates

Templates support recurrence patterns:

- **none**: One-time budget
- **weekly**: Every 7 days
- **monthly**: Same day each month
- **yearly**: Same date each year

### 3. Actual Amount Calculation

**Computed on-the-fly (not stored in database):**

- Queries transactions within budget period using SQL subquery
- Filters by account_id and/or category_id based on budget constraints
- Sums expense transactions (income excluded)
- Uses COALESCE to return 0 when no transactions exist
- Calculation happens automatically on every budget fetch (List/Get operations)

**SQL Pattern:**

```sql
COALESCE((
  SELECT SUM(t.amount)
  FROM transactions t
  WHERE t.deleted_at IS NULL
    AND t.date >= b.period_start
    AND t.date <= b.period_end
    AND (b.account_id IS NULL OR t.account_id = b.account_id)
    AND (b.category_id IS NULL OR t.category_id = b.category_id)
), 0) as actual_amount
```

### 4. Background Worker

Worker automatically:

- Runs daily at midnight (00:00)
- Checks active templates (recurrence != 'none', within start/end date range)
- Calculates next period based on recurrence pattern:
  - **weekly**: Monday to Sunday of upcoming week
  - **monthly**: Uses template start_date day, handles month-end edge cases
  - **yearly**: Uses template start_date month and day
- Creates budgets idempotently (checks for duplicates)
- Logs execution details (success count, skipped count, error count)
- Starts automatically with application
- Stops gracefully on shutdown

## Usage Examples

### Create Recurring Monthly Budget Template

```json
POST /budget-templates
{
  "accountId": 1,
  "categoryId": 5,
  "amountLimit": 100000,
  "recurrence": "monthly",
  "startDate": "2026-01-01",
  "note": "Monthly food budget"
}
```

### Create One-Time Budget

```json
POST /budgets
{
  "categoryId": 3,
  "periodStart": "2026-01-01",
  "periodEnd": "2026-01-31",
  "amountLimit": 50000,
  "note": "January entertainment budget"
}
```

### Query Budgets by Account

```
GET /accounts/1/budgets?pageNumber=1&pageSize=10
```

### Get Specific Account Budget

```
GET /accounts/1/budgets/123
```

Response includes actual_amount computed from transactions automatically.

## Worker Implementation Details

### Architecture

The worker system follows a job-based architecture with the following components:

**Job Interface:**

```go
type Job interface {
    Name() string           // Unique identifier
    Run(ctx context.Context) error  // Execution logic
    Schedule() string       // "HH:MM" format (24-hour)
}
```

**Worker Lifecycle:**

1. Register jobs during application setup (in `routes.Setup()`)
2. Start worker after server initialization (in `main.go`)
3. Each job runs in its own goroutine
4. Worker stops gracefully on shutdown signal

### Budget Generation Logic

**Active Template Query:**

```sql
SELECT * FROM budget_templates
WHERE deleted_at IS NULL
  AND recurrence != 'none'
  AND start_date <= NOW()
  AND (end_date IS NULL OR end_date >= NOW())
```

**Period Calculation Examples:**

- **Weekly** (template.start_date = 2026-01-06, run date = 2026-01-08):

  - Calculates Monday of current/next week: 2026-01-13 to 2026-01-19

- **Monthly** (template.start_date = 2026-01-15, run date = 2026-02-10):

  - Uses day 15: 2026-02-15 to 2026-03-14 23:59:59
  - Handles edge case: If template day is 31 and target month has 30 days, uses day 30

- **Yearly** (template.start_date = 2026-03-20, run date = 2026-12-25):
  - Next period: 2027-03-20 to 2028-03-19 23:59:59

**Duplicate Prevention:**

- Checks if budget already exists with same template_id, account_id, category_id, and period
- Uses `CheckDuplicate()` repository method before creation

**Error Handling:**

- Individual template failures don't stop processing
- Each template result logged separately
- Summary statistics logged at completion (success/skip/error counts)

### Configuration

Schedule is hardcoded to "00:00" (midnight) but can be modified in `budget_worker.go`:

```go
func (j *BudgetGenerationJob) Schedule() string {
    return "00:00"  // Change this for different run time
}
```

### Monitoring

Worker logs include:

- Job registration: `"Registered job", "name", "schedule"`
- Execution start: `"Executing job", "name"`
- Execution complete: `"Job execution completed", "name", "duration"`
- Execution failure: `"Job execution failed", "name", "error", "duration"`
- Budget creation: `"Created budget from template", "budget_id", "template_id", "period_start", "period_end"`
- Skipped budgets: `"Budget already exists for period, skipping", "template_id"`
- Summary: `"Budget generation completed", "success", "skipped", "errors"`

## Testing

All components include comprehensive unit tests:

- Schema validation tests
- Repository CRUD tests with pgxmock
- Service business logic tests
- Resource HTTP handler tests

Run tests:

```bash
go test ./internal/database/schemas -v
go test ./internal/repositories -v
go test ./internal/services -v
go test ./internal/resources -v
```

## Migration

Apply migration:

```bash
# Migration will be applied automatically on startup
# Or manually via migrate tool
```

Rollback:

```bash
migrate -path internal/database/migrations -database "postgres://..." down 1
```
