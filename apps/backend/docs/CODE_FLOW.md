# Code Flow

## Application Startup

```
main.go:main()
  ├─ signal.NotifyContext(ctx, SIGINT, SIGTERM)
  ├─ http.NewServeMux()
  ├─ configs.NewEnvironment()
  ├─ configs.NewDatabase(env)
  ├─ db.Connect(ctx) → pgxpool.Pool
  ├─ configs.RunMigration(env) → Apply *.up.sql files
  ├─ humago.New(svr, configs.NewOpenApi(env)) → Huma API
  ├─ internal.RegisterMiddlewares(ctx, huma)
  ├─ internal.RegisterPublicRoutes(ctx, huma, pool)
  ├─ internal.RegisterPrivateRoutes(ctx, huma, pool)
  ├─ internal.RegisterWorkers(ctx, pool) → returns cleanup fn
  ├─ http.Server.ListenAndServe() [goroutine]
  └─ Wait for context cancellation
     └─ Graceful shutdown sequence
```

## HTTP Request Handling

### Route Registration (handlers.go)

**Public Routes:**

```
RegisterPublicRoutes(ctx, huma, pool)
  └─ Create AuthRepository (context-based, no pool needed)
     └─ Create AuthService
        └─ Register AuthResource.Routes(huma)
           ├─ POST /auth/login
           ├─ POST /auth/signup
           └─ POST /auth/logout
```

**Private Routes:**

```
RegisterPrivateRoutes(ctx, huma, pool)
  ├─ Apply SessionMiddleware globally for this scope
  ├─ Create All Repositories (pool-based)
  ├─ Create All Services
  └─ Register All Resources
      ├─ AccountResource.Routes(huma)
      │  ├─ GET /accounts
      │  ├─ POST /accounts
      │  ├─ GET /accounts/{id}
      │  ├─ PUT /accounts/{id}
      │  └─ DELETE /accounts/{id}
      ├─ CategoryResource.Routes(huma)
      ├─ TransactionResource.Routes(huma)
      ├─ BudgetResource.Routes(huma)
      └─ ... [other resources]
```

### Request Processing Pipeline

```
HTTP Request arrives at Huma
  ├─ [Middleware Phase]
  │  ├─ CORS Middleware
  │  │  └─ Validate origin + set headers
  │  │     └─ Return 204 if preflight + invalid origin
  │  └─ SessionMiddleware (if private route)
  │     ├─ Extract Bearer token
  │     ├─ Parse token (JWT validation)
  │     └─ Return 401 if invalid
  │
  ├─ [Route Matching Phase]
  │  └─ Huma matches HTTP method + path to handler
  │
  └─ [Handler Phase]
     └─ Resource handler (e.g., TransactionResource.List)
        ├─ Parse request query params + validate
        ├─ Call Service method
        │  └─ Service calls Repository methods
        │     ├─ Build SQL query
        │     ├─ Execute on pool
        │     └─ Map results to model
        ├─ Transform response
        └─ Return HTTP 200 + JSON body
```

## Specific Flow Example: Create Transaction

```
POST /transactions
{
  "type": "expense",
  "amount": 5000,
  "accountID": 1,
  "categoryID": 2,
  "note": "Lunch"
}

├─ CORS Middleware
│  └─ Validate origin
│
├─ SessionMiddleware
│  └─ Extract + validate Bearer token
│
└─ TransactionResource.Post(ctx, req)
   │
   ├─ Call TransactionService.Create(ctx, req)
   │  │
   │  ├─ Call TransactionRepository.Create(ctx, req)
   │  │  │
   │  │  ├─ Execute:
   │  │  │  INSERT INTO transactions (type, date, amount, account_id, category_id, note)
   │  │  │  VALUES ($1, NOW(), $2, $3, $4, $5)
   │  │  │  RETURNING id, created_at, updated_at
   │  │  │
   │  │  └─ Return TransactionModel {id: 123, ...}
   │  │
   │  ├─ Call TransactionRepository.UpdateAccountBalance(ctx, accountID, -amount)
   │  │  │
   │  │  └─ Execute:
   │  │     UPDATE accounts SET amount = amount - $1, updated_at = NOW()
   │  │     WHERE id = $2
   │  │
   │  └─ Return CreateTransactionResponseModel
   │
   └─ Response HTTP 200
      {
        "id": 123,
        "type": "expense",
        "amount": 5000,
        "accountID": 1,
        "categoryID": 2,
        ...
      }
```

## List Request Flow (Pagination)

```
GET /transactions?pageNumber=1&pageSize=10&sortBy=date&sortOrder=desc

└─ TransactionResource.Get(ctx, params)
   │
   └─ TransactionService.List(ctx, params)
      │
      └─ TransactionRepository.List(ctx, params)
         │
         ├─ Validate + normalize params
         │  ├─ pageNumber >= 1, else 1
         │  ├─ pageSize 1-100, else 10
         │  └─ sortBy/sortOrder from allowlist
         │
         ├─ Calculate offset = (pageNumber - 1) * pageSize
         │
         ├─ Execute count query:
         │  SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL
         │
         ├─ Execute paginated query:
         │  SELECT * FROM transactions
         │  WHERE deleted_at IS NULL
         │  ORDER BY {sortBy} {sortOrder}
         │  LIMIT $1 OFFSET $2
         │
         └─ Return ListTransactionsResponseModel
            {
              "data": [...],
              "pageNumber": 1,
              "pageSize": 10,
              "totalCount": 47,
              "totalPages": 5
            }
```

## Delete Flow (Soft Delete)

```
DELETE /accounts/{id}

└─ AccountResource.Delete(ctx, id)
   │
   └─ AccountService.Delete(ctx, id)
      │
      └─ AccountRepository.Delete(ctx, id)
         │
         ├─ Execute:
         │  UPDATE accounts
         │  SET deleted_at = NOW(), updated_at = NOW()
         │  WHERE id = $1
         │
         └─ Return success
            (Record still in DB, but filtered by deleted_at IS NULL in SELECT queries)
```

## Worker Flow: Transaction Template Processing

```
TransactionTemplateWorker.Start()
  │
  └─ Register CronTask("process-transaction-templates", 1 hour)
     │
     └─ CronWorker spawns goroutine with ticker
        │
        └─ [Every 1 hour] CronWorker.runTask()
           │
           ├─ Call TransactionTemplateWorker.processTemplates(ctx)
           │  │
           │  ├─ TransactionTemplateRepository.GetDueTemplates(ctx)
           │  │  │
           │  │  ├─ Query templates WHERE:
           │  │  │  - deleted_at IS NULL
           │  │  │  - recurrence != 'none'
           │  │  │  - start_date <= TODAY
           │  │  │  - (end_date IS NULL OR end_date >= TODAY)
           │  │  │  - (last_executed_at IS NULL OR elapsed based on recurrence interval)
           │  │  │
           │  │  └─ Return [template1, template2, ...]
           │  │
           │  └─ For each template:
           │     │
           │     ├─ Call TransactionTemplateWorker.processTemplate(ctx, template)
           │     │  │
           │     │  ├─ Build CreateTransactionRequestModel from template
           │     │  │  {
           │     │  │    "type": template.Type,
           │     │  │    "amount": template.Amount,
           │     │  │    "accountID": template.AccountID,
           │     │  │    "categoryID": template.CategoryID,
           │     │  │    "date": Today
           │     │  │  }
           │     │  │
           │     │  └─ Call TransactionService.Create(ctx, request)
           │     │     └─ Creates transaction record
           │     │
           │     └─ Call TransactionTemplateRepository.UpdateLastExecuted(ctx, templateID)
           │        │
           │        └─ Execute:
           │           UPDATE transaction_templates
           │           SET last_executed_at = NOW(), updated_at = NOW()
           │           WHERE id = $1
           │
           └─ Log completion
              (If error on individual template, log and continue)
```

## Worker Flow: Budget Template Processing

```
BudgetTemplateWorker.Start()
  │
  └─ Register CronTask("process-budget-templates", 24 hours)
     │
     └─ CronWorker spawns goroutine with ticker
        │
        └─ [Every 24 hours] CronWorker.runTask()
           │
           ├─ Call BudgetTemplateWorker.processTemplates(ctx)
           │  │
           │  ├─ BudgetTemplateRepository.GetDueTemplates(ctx)
           │  │  │
           │  │  ├─ Query templates WHERE:
           │  │  │  - deleted_at IS NULL
           │  │  │  - recurrence != 'none'
           │  │  │  - start_date <= TODAY
           │  │  │  - (end_date IS NULL OR end_date >= TODAY)
           │  │  │  - (last_executed_at IS NULL OR elapsed based on recurrence interval)
           │  │  │
           │  │  └─ Return [template1, template2, ...]
           │  │
           │  └─ For each template:
           │     │
           │     ├─ Call BudgetTemplateWorker.processTemplate(ctx, template)
           │     │  │
           │     │  ├─ Call calculateBudgetPeriod(template.Recurrence)
           │     │  │  └─ Return (periodStart, periodEnd) based on recurrence:
           │     │  │     - weekly: Monday-Sunday of current week
           │     │  │     - monthly: 1st-last day of current month
           │     │  │     - yearly: Jan 1 - Dec 31 of current year
           │     │  │
           │     │  ├─ Build CreateBudgetRequestModel from template
           │     │  │  {
           │     │  │    "templateID": template.ID,
           │     │  │    "amountLimit": template.AmountLimit,
           │     │  │    "periodStart": calculated,
           │     │  │    "periodEnd": calculated
           │     │  │  }
           │     │  │
           │     │  └─ Call BudgetService.Create(ctx, request)
           │     │     └─ Creates budget record
           │     │
           │     └─ Call BudgetTemplateRepository.UpdateLastExecuted(ctx, templateID)
           │        │
           │        └─ Execute:
           │           UPDATE budget_templates
           │           SET last_executed_at = NOW(), updated_at = NOW()
           │           WHERE id = $1
           │
           └─ Log completion
              (If error on individual template, log and continue)
```

## Error Handling Flow

```
Error at any layer:

Repository Layer:
  └─ SQL error: fmt.Errorf("failed to query accounts: %w", err)
     └─ Propagates up

Service Layer:
  └─ Catches error, may transform:
     └─ fmt.Errorf("failed to update account balance: %w", err)
     └─ Propagates up

Resource Layer:
  └─ Catches error, transforms to HTTP response:
     └─ huma.Error400BadRequest("Invalid request", err)
     └─ OR huma.Error500InternalServerError("Server error", err)

HTTP Response (HTTP 400):
  {
    "status": 400,
    "message": "Invalid request",
    "detail": "failed to update account balance: database connection lost"
  }
```

## Shutdown Flow

```
OS sends SIGTERM/SIGINT
  │
  └─ signal.NotifyContext cancels context
     │
     └─ main() receives context.Done()
        │
        ├─ Call stopWorkers() [cleanup fn from RegisterWorker]
        │  │
        │  ├─ TransactionTemplateWorker.Stop()
        │  │  └─ cancel() context of CronWorker
        │  │     └─ runTask() goroutines exit
        │  │     └─ sync.WaitGroup.Wait() returns
        │  │
        │  └─ BudgetTemplateWorker.Stop()
        │     └─ [same as above]
        │
        └─ srv.Shutdown(ctx) with 10s timeout
           └─ HTTP server stops accepting connections
           └─ Waits for in-flight requests to complete
           └─ If timeout, force close remaining connections

Application exits cleanly
```
