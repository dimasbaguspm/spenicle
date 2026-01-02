# Transaction Template Feature

## Overview

Recurring transaction system for automatic transaction generation with support for:

- Recurring transactions (daily, weekly, monthly, yearly)
- Installment payments with tracking
- One-time scheduled transactions
- Automatic transaction creation via worker

## Database Schema

### Table Created (Migration 000005)

**transaction_templates** - Recurring transaction configurations

- Links to accounts and categories
- Transaction type: income, expense, transfer
- Recurrence patterns: none, daily, weekly, monthly, yearly
- Start/end dates for recurrence period
- Installment tracking: installment_count, installment_current
- Automatically generates transactions via background worker

## API Endpoints

### Transaction Templates (under /transactions namespace)

- `GET /transactions/templates` - List templates (paginated, filterable)
- `POST /transactions/templates` - Create template
- `GET /transactions/templates/{id}` - Get template details
- `PATCH /transactions/templates/{id}` - Update template
- `DELETE /transactions/templates/{id}` - Soft delete template

## Implementation Files

### Schemas (`internal/database/schemas/`)

- `transaction_template_schema.go` - Transaction template entity
- `transaction_template_create_schema.go` - Create DTO with validation
- `transaction_template_update_schema.go` - Update DTO
- `transaction_template_search_param_schema.go` - Search/filter parameters
- `transaction_template_paginated_schema.go` - Paginated response

### Repositories (`internal/repositories/`)

- `transaction_template_repository.go` - CRUD for templates
  - GetActiveTemplates() - Fetches templates ready for generation
  - IncrementInstallment() - Tracks installment progress

### Services (`internal/services/`)

- `transaction_template_service.go` - Business logic for templates

### Resources (`internal/resources/`)

- `transaction_resource.go` - Extended with template endpoints

### Worker (`internal/worker/`)

- `transaction_worker.go` - Automatic transaction generation from templates
  - Runs daily at midnight (00:00)
  - Creates transactions based on recurrence pattern
  - Increments installment counter
  - Respects start/end dates and installment limits

## Key Features

### 1. Recurrence Patterns

- **none**: One-time scheduled transaction
- **daily**: Every day
- **weekly**: Every 7 days
- **monthly**: Same day each month
- **yearly**: Same date each year

### 2. Installment Tracking

Templates can track installment payments:

- `installment_count`: Total number of payments
- `installment_current`: Current payment number (0-based)
- Worker automatically stops when all installments complete
- Installment info appended to transaction note

### 3. Automatic Transaction Generation

Worker automatically:

- Runs daily at midnight (00:00)
- Checks active templates (recurrence != 'none', within dates, installments remaining)
- Calculates next transaction date based on recurrence and current installment
- Creates transaction when due date arrives
- Increments installment counter after creation
- Stops when end_date reached or all installments paid

## Usage Examples

### Create Monthly Salary Template

```json
POST /transactions/templates
{
  "accountId": 1,
  "categoryId": 2,
  "type": "income",
  "amount": 500000,
  "description": "Monthly salary",
  "recurrence": "monthly",
  "startDate": "2026-01-01",
  "note": "Salary deposit"
}
```

### Create Installment Payment Template

```json
POST /transactions/templates
{
  "accountId": 1,
  "categoryId": 5,
  "type": "expense",
  "amount": 100000,
  "description": "Laptop payment",
  "recurrence": "monthly",
  "startDate": "2026-01-01",
  "endDate": "2026-12-01",
  "installmentCount": 12,
  "note": "12-month installment plan"
}
```

Response after 3 months of worker runs:

```json
{
  "id": 1,
  "accountId": 1,
  "categoryId": 5,
  "type": "expense",
  "amount": 100000,
  "recurrence": "monthly",
  "installmentCount": 12,
  "installmentCurrent": 3,
  ...
}
```

### Create Weekly Recurring Expense

```json
POST /transactions/templates
{
  "accountId": 1,
  "categoryId": 8,
  "type": "expense",
  "amount": 25000,
  "description": "Weekly groceries",
  "recurrence": "weekly",
  "startDate": "2026-01-06",
  "note": "Grocery shopping"
}
```

## Worker Implementation Details

### Architecture

Transaction generation follows the same job-based architecture as budget worker:

**Active Template Query:**

```sql
SELECT * FROM transaction_templates
WHERE deleted_at IS NULL
  AND recurrence != 'none'
  AND start_date <= NOW()
  AND (end_date IS NULL OR end_date >= NOW())
  AND (installment_count IS NULL OR installment_current < installment_count)
```

**Date Calculation:**

- Uses `installment_current` to track periods completed
- **Daily**: start_date + (installment_current \* 1 day)
- **Weekly**: start_date + (installment_current \* 7 days)
- **Monthly**: start_date + (installment_current months)
- **Yearly**: start_date + (installment_current years)

**Transaction Note:**

- Copies template.note to transaction
- For installments: Appends "(Installment X/Y)" to note
- Example: "Laptop payment (Installment 3/12)"

**Installment Completion:**

- Worker increments `installment_current` after each transaction
- Stops automatically when `installment_current >= installment_count`
- Template remains active until explicitly deleted or end_date reached

### Error Handling

- Individual template failures don't stop processing
- Failed transactions logged with error details
- Summary statistics: success count, error count

### Monitoring

Worker logs include:

- Execution start: `"Executing job", "name": "transaction_generation"`
- Transaction creation: `"Created transaction from template", "transaction_id", "template_id", "amount", "type"`
- Execution summary: `"Transaction generation completed", "success", "errors"`

## Testing

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
```

Rollback:

```bash
migrate -path internal/database/migrations -database "postgres://..." down 1
```

## Status

✅ Completed:

- Migration 000005_transaction_templates created
- All 5 schema files with validation
- Repository with CRUD and active template query
- Service with business logic
- Extended transaction resource with template endpoints
- Worker with daily transaction generation
- Installment tracking system
- Route registration and dependency injection

⏳ Pending:

- Unit tests for all layers
- Integration testing with database
