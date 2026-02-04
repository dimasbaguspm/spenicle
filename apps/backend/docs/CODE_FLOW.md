# Code Flow

## Application Startup

```
cmd/app/main.go:main()
  ├─ signal.NotifyContext(ctx, SIGINT, SIGTERM)
  ├─ slog.New(slog.NewJSONHandler) → Initialize structured logging
  ├─ configs.NewEnvironment() → Load env vars
  ├─ configs.NewDatabase(ctx, env) → pgxpool.Pool
  ├─ configs.NewRedisClient(ctx, env) → redis.Client
  ├─ http.NewServeMux() → HTTP mux
  ├─ humago.New(svr, configs.NewOpenApi(svr, env)) → Huma API
  ├─ internal.RegisterPublicRoutes(ctx, svr, huma, db, rdb)
  │  ├─ Register /metrics (Prometheus)
  │  ├─ Register /health
  │  ├─ Create RootRepository(ctx, db)
  │  ├─ Create RootService(repos, rdb)
  │  └─ Register AuthResource
  ├─ internal.RegisterPrivateRoutes(ctx, huma, db, rdb)
  │  ├─ Apply SessionMiddleware to scope
  │  ├─ Create RootRepository(ctx, db)
  │  ├─ Create RootService(repos, rdb)
  │  └─ Register all resources (Account, Category, Transaction, etc.)
  ├─ internal.RegisterWorkers(ctx, db, rdb) → returns cleanup fn
  │  ├─ Create RootRepository + RootService
  │  ├─ Start TransactionTemplateWorker
  │  └─ Start BudgetTemplateWorker
  ├─ Build middleware stack:
  │  └─ RateLimitMiddleware(env, rdb)(
  │       ObservabilityMiddleware(
  │         CORS(svr)))
  ├─ http.Server.ListenAndServe() [goroutine]
  └─ Wait for context cancellation
     └─ Graceful shutdown sequence
```

## HTTP Request Handling

### Route Registration (handlers.go)

**Public Routes:**

```
RegisterPublicRoutes(ctx, svr, huma, db, rdb)
  ├─ svr.Handle("/metrics", promhttp.Handler())
  ├─ svr.HandleFunc("/health", ...)
  ├─ rpts := repositories.NewRootRepository(ctx, db)
  ├─ sevs := services.NewRootService(rpts, rdb)
  └─ resources.NewAuthResource(sevs.Ath).Routes(huma)
     ├─ POST /auth/login
     ├─ POST /auth/signup
     └─ POST /auth/logout
```

**Private Routes:**

```
RegisterPrivateRoutes(ctx, huma, db, rdb)
  ├─ huma.UseMiddleware(middleware.SessionMiddleware(huma))
  ├─ rpts := repositories.NewRootRepository(ctx, db)
  ├─ sevs := services.NewRootService(rpts, rdb)
  └─ Register All Resources (each receives sevs)
      ├─ resources.NewAccountResource(sevs).Routes(huma)
      │  ├─ GET /accounts
      │  ├─ POST /accounts
      │  ├─ GET /accounts/{id}
      │  ├─ PUT /accounts/{id}
      │  └─ DELETE /accounts/{id}
      ├─ resources.NewCategoryResource(sevs).Routes(huma)
      ├─ resources.NewAccountStatisticsResource(sevs).Routes(huma)
      ├─ resources.NewCategoryStatisticsResource(sevs).Routes(huma)
      ├─ resources.NewTransactionResource(sevs).Routes(huma)
      ├─ resources.NewSummaryResource(sevs).Routes(huma)
      ├─ resources.NewBudgetResource(sevs).Routes(huma)
      ├─ resources.NewBudgetTemplateResource(sevs).Routes(huma)
      ├─ resources.NewTagResource(sevs).Routes(huma)
      └─ resources.NewSeedResource(db, rdb).Routes(huma)
```

### Request Processing Pipeline

```
HTTP Request arrives
  ├─ [Middleware Stack - Server Level]
  │  ├─ ObservabilityMiddleware
  │  │  ├─ Generate request ID
  │  │  ├─ Log incoming request
  │  │  └─ Start metrics timer
  │  │
  │  ├─ RateLimitMiddleware (production only)
  │  │  ├─ Check Redis for IP request count
  │  │  └─ Return 429 if exceeded, else continue
  │  │
  │  └─ CORS Middleware
  │     ├─ Validate origin
  │     └─ Set Access-Control headers
  │
  ├─ [Huma Route Matching]
  │  └─ Match HTTP method + path to handler
  │
  ├─ [Middleware - Huma Scope]
  │  └─ SessionMiddleware (private routes only)
  │     ├─ Extract Bearer token
  │     ├─ Parse token (JWT validation)
  │     └─ Return 401 if invalid
  │
  └─ [Handler Phase]
     └─ Resource handler (e.g., AccountResource.List)
        ├─ Huma validates request schema
        ├─ Parse request query params
        ├─ Call Service method
        │  ├─ Check cache (Redis)
        │  │  ├─ Cache hit: Return cached data
        │  │  └─ Cache miss: Fetch from repository
        │  │
        │  └─ Service calls Repository method
        │     ├─ Build SQL query with filters
        │     ├─ Execute on pool (PostgreSQL)
        │     ├─ Map rows to models
        │     └─ Return data
        │
        ├─ Cache result (if cache miss)
        ├─ Transform response
        └─ Return HTTP 200 + JSON body
           │
           └─ ObservabilityMiddleware logs completion + records metrics
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

├─ ObservabilityMiddleware
│  ├─ Generate request ID: "req_abc123"
│  └─ Log: "Incoming request" {request_id, method="POST", url="/transactions"}
│
├─ RateLimitMiddleware (production only)
│  ├─ Redis INCR rate_limit:127.0.0.1:2024-01-04T10:15
│  ├─ Count: 45/100
│  └─ Continue (set X-RateLimit-* headers)
│
├─ CORS Middleware
│  └─ Validate origin + set Access-Control headers
│
├─ SessionMiddleware
│  ├─ Extract "Bearer {token}"
│  ├─ AuthRepository.ParseToken(token)
│  └─ Valid → Continue
│
└─ TransactionResource.Post(ctx, req)
   │
   ├─ Call TransactionService.Create(ctx, req)
   │  │
   │  ├─ Call repos.Tsct.Create(ctx, req)
   │  │  │
   │  │  ├─ Execute SQL:
   │  │  │  INSERT INTO transactions (type, date, amount, account_id, category_id, note)
   │  │  │  VALUES ($1, NOW(), $2, $3, $4, $5)
   │  │  │  RETURNING id, created_at, updated_at
   │  │  │
   │  │  └─ Return TransactionModel {id: 123, ...}
   │  │
   │  ├─ Update account balance (business logic):
   │  │  └─ repos.Acc.UpdateAccountBalance(ctx, accountID, -amount)
   │  │     └─ Execute SQL:
   │  │        UPDATE accounts SET amount = amount - $1, updated_at = NOW()
   │  │        WHERE id = $2
   │  │
   │  ├─ Invalidate affected caches:
   │  │  ├─ common.InvalidateCache(ctx, rdb, "transactions:*")
   │  │  ├─ common.InvalidateCache(ctx, rdb, "accounts:*")
   │  │  ├─ common.InvalidateCache(ctx, rdb, "account_statistics:*")
   │  │  └─ common.InvalidateCache(ctx, rdb, "summary:*")
   │  │
   │  └─ Return CreateTransactionResponseModel
   │
   ├─ Response HTTP 201 Created
   │  {
   │    "id": 123,
   │    "type": "expense",
   │    "amount": 5000,
   │    "accountID": 1,
   │    "categoryID": 2,
   │    ...
   │  }
   │
   └─ ObservabilityMiddleware
      ├─ Duration: 45ms
      ├─ Prometheus metrics:
      │  ├─ requests_total{method="POST", status="201", path="/transactions"}++
      │  ├─ request_duration_seconds{method="POST", path="/transactions"}.Observe(0.045)
      │  └─ last_request_time{method="POST", path="/transactions"} = now
      └─ Log: "Request completed" {request_id, duration_ms=45, status=201}
```

## List Request Flow with Caching

```
GET /accounts?pageNumber=1&pageSize=10&sortBy=createdAt&sortOrder=desc

├─ [Middleware Stack: Observability → RateLimit → CORS → Session]
│
└─ AccountResource.List(ctx, params)
   │
   └─ AccountService.List(ctx, params)
      │
      ├─ Build cache key:
      │  └─ common.BuildCacheKey(0, params, "accounts:list")
      │     Result: "accounts:list:0:{\"pageNumber\":1,\"pageSize\":10,...}"
      │
      ├─ Call common.FetchWithCache[ListAccountsResponseModel](...)
      │  │
      │  ├─ Try GetCache(ctx, rdb, cacheKey)
      │  │  │
      │  │  ├─ Cache HIT:
      │  │  │  ├─ observability.CacheHits.WithLabelValues("accounts").Inc()
      │  │  │  └─ Return cached data (fast path)
      │  │  │
      │  │  └─ Cache MISS (redis.Nil):
      │  │     ├─ observability.CacheMisses.WithLabelValues("accounts").Inc()
      │  │     └─ Execute fetcher function →
      │  │
      │  └─ Fetcher function: repos.Acc.List(ctx, params)
      │     │
      │     ├─ Validate + normalize params
      │     │  ├─ pageNumber >= 1, else 1
      │     │  ├─ pageSize 1-100, else 10
      │     │  └─ sortBy/sortOrder from allowlist
      │     │
      │     ├─ Calculate offset = (pageNumber - 1) * pageSize
      │     │
      │     ├─ Execute count query:
      │     │  SELECT COUNT(*) FROM accounts WHERE deleted_at IS NULL
      │     │
      │     ├─ Execute paginated query:
      │     │  SELECT * FROM accounts
      │     │  WHERE deleted_at IS NULL
      │     │  ORDER BY {sortBy} {sortOrder}
      │     │  LIMIT $1 OFFSET $2
      │     │
      │     ├─ Map rows to models
      │     │
      │     └─ Return ListAccountsResponseModel
      │        {
      │          "data": [...],
      │          "pageNumber": 1,
      │          "pageSize": 10,
      │          "totalCount": 47,
      │          "totalPages": 5
      │        }
      │
      ├─ SetCache(ctx, rdb, cacheKey, result, 10*time.Minute)
      │
      └─ Return result (fresh data, now cached)

Response HTTP 200
{
  "data": [...],
  "pageNumber": 1,
  "pageSize": 10,
  "totalCount": 47,
  "totalPages": 5
}
```

**Cache Key Uniqueness:**

Different query parameters = different cache keys:
- `accounts:list:0:{\"pageNumber\":1,\"pageSize\":10}`
- `accounts:list:0:{\"pageNumber\":2,\"pageSize\":10}`
- `accounts:list:0:{\"pageNumber\":1,\"pageSize\":25}`

Each combination cached separately for 10 minutes.

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
