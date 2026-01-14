# Main and Handlers

## Application Entry Point (main.go)

The `main()` function orchestrates application startup, dependency initialization, and graceful shutdown.

### Main Function Flow

```go
func main() {
    // 1. Create cancellable context
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    // 2. Initialize HTTP infrastructure
    svr := http.NewServeMux()

    // 3. Load configuration
    env := configs.NewEnvironment()

    // 4. Initialize database
    db := configs.NewDatabase(env)
    pool, err := db.Connect(ctx)
    if err != nil {
        panic(err)
    }

    // 5. Run migrations
    if err := configs.RunMigration(env); err != nil {
        panic(err)
    }

    // 6. Initialize Huma API framework
    humaSvr := humago.New(svr, configs.NewOpenApi(env))

    // 7. Register middlewares
    internal.RegisterMiddlewares(ctx, humaSvr)

    // 8. Register public routes (auth)
    internal.RegisterPublicRoutes(ctx, humaSvr, pool)

    // 9. Register private routes (authenticated)
    internal.RegisterPrivateRoutes(ctx, humaSvr, pool)

    // 10. Register background workers
    stopWorkers := internal.RegisterWorker(ctx, pool)

    // 11. Start HTTP server in goroutine
    srv := &http.Server{
        Addr:    fmt.Sprintf(":%s", env.AppPort),
        Handler: svr,
    }

    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("HTTP server error", "err", err)
        }
    }()

    // 12. Wait for OS signal
    <-ctx.Done()
    slog.Info("Shutting down HTTP server")

    // 13. Stop workers first
    stopWorkers()

    // 14. Gracefully shutdown HTTP server (10s timeout)
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    if err := srv.Shutdown(shutdownCtx); err != nil {
        slog.Error("Graceful shutdown failed, forcing exit", "err", err)
    } else {
        slog.Info("Server stopped")
    }
}
```

### Initialization Order (Important!)

1. **Context** - Required for cancellation
2. **HTTP Mux** - Routing infrastructure
3. **Config** - Environment variables
4. **Database** - Connection pool
5. **Migrations** - Schema setup
6. **Huma** - API framework
7. **Middlewares** - Before route registration
8. **Routes** - Public first, then private
9. **Workers** - After routes
10. **HTTP Server** - Listen on port

**Why this order matters:**

- Database must be connected before routes (routes create repositories)
- Migrations before routes (schema must exist)
- Middlewares before routes (they're applied during route registration)
- Workers after routes (workers may call services)

## Handlers Registration

Route registration is centralized in `handlers.go` with three main functions.

### RegisterMiddlewares()

```go
func RegisterMiddlewares(ctx context.Context, huma huma.API) {
    huma.UseMiddleware(internalmiddleware.CORS(huma))
}
```

**Purpose:** Register middlewares that apply globally

**Middlewares registered:**

- CORS middleware (allow cross-origin requests)

**Applied to:** All routes

**Called from:** main.go line 39

---

### RegisterPublicRoutes()

```go
func RegisterPublicRoutes(ctx context.Context, huma huma.API, pool *pgxpool.Pool) {
    // 1. Create auth repository
    ap := repositories.NewAuthRepository(ctx)

    // 2. Create auth service
    as := services.NewAuthService(ap)

    // 3. Register auth resource routes
    resources.NewAuthResource(as).Routes(huma)
}
```

**Purpose:** Register unauthenticated routes (no SessionMiddleware)

**Dependency Pattern:**

```
Repository → Service → Resource → Routes
```

**Routes registered:**

- POST /auth/login
- POST /auth/signup
- POST /auth/logout

**Why separate:** SessionMiddleware is not applied to these routes (needed for login)

**Called from:** main.go line 40

---

### RegisterPrivateRoutes()

```go
func RegisterPrivateRoutes(ctx context.Context, huma huma.API, pool *pgxpool.Pool) {
    // 1. Apply SessionMiddleware to all routes in this scope
    huma.UseMiddleware(internalmiddleware.SessionMiddleware(huma))

    // 2. Create all repositories (pool-based)
    accountRepo := repositories.NewAccountRepository(pool)
    categoryRepo := repositories.NewCategoryRepository(pool)
    transactionRepo := repositories.NewTransactionRepository(pool)
    summaryRepo := repositories.NewSummaryRepository(pool)
    budgetRepo := repositories.NewBudgetRepository(pool)
    budgetTemplateRepo := repositories.NewBudgetTemplateRepository(pool)
    transactionRelationRepo := repositories.NewTransactionRelationRepository(pool)
    tagRepo := repositories.NewTagRepository(pool)
    transactionTagRepo := repositories.NewTransactionTagRepository(pool)
    transactionTemplateRepo := repositories.NewTransactionTemplateRepository(pool)

    // 3. Create all services
    accountService := services.NewAccountService(accountRepo)
    categoryService := services.NewCategoryService(categoryRepo)
    transactionService := services.NewTransactionService(transactionRepo)
    summaryService := services.NewSummaryService(summaryRepo)
    budgetService := services.NewBudgetService(budgetRepo)
    budgetTemplateService := services.NewBudgetTemplateService(budgetTemplateRepo)
    transactionRelationService := services.NewTransactionRelationService(transactionRelationRepo, transactionRepo)
    tagService := services.NewTagService(tagRepo)
    transactionTagService := services.NewTransactionTagService(transactionTagRepo)
    transactionTemplateService := services.NewTransactionTemplateService(transactionTemplateRepo)

    // 4. Register all resources
    resources.NewAccountResource(accountService).Routes(huma)
    resources.NewCategoryResource(categoryService).Routes(huma)
    resources.NewTransactionResource(transactionService, transactionRelationService, transactionTagService, transactionTemplateService).Routes(huma)
    resources.NewSummaryResource(summaryService).Routes(huma)
    resources.NewBudgetResource(budgetService).Routes(huma)
    resources.NewBudgetTemplateResource(budgetTemplateService).Routes(huma)
    resources.NewTagResource(tagService).Routes(huma)
}
```

**Purpose:** Register authenticated routes (SessionMiddleware required)

**Middleware applied:** SessionMiddleware (validates JWT token)

**Routes registered:**

- All account operations
- All category operations
- All transaction operations
- All budget operations
- All tag operations
- Summary operations

**Dependency Pattern (per resource):**

```
Repository → Service → Resource → Routes
```

**Example for transactions:**

```
TransactionRepository
  ↓
TransactionService
  ↓
TransactionResource
  ↓
huma.Get(api, "GET /transactions", r.List)
huma.Post(api, "POST /transactions", r.Create)
... etc
```

**Called from:** main.go line 41

---

### RegisterWorker()

```go
func RegisterWorker(ctx context.Context, pool *pgxpool.Pool) func() {
    // 1. Create repositories
    ttr := repositories.NewTransactionTemplateRepository(pool)
    tr := repositories.NewTransactionRepository(pool)
    btr := repositories.NewBudgetTemplateRepository(pool)
    br := repositories.NewBudgetRepository(pool)

    // 2. Create services
    ts := services.NewTransactionService(tr)
    budgetService := services.NewBudgetService(br)

    // 3. Initialize transaction template worker
    ttWorker := workers.NewTransactionTemplateWorker(ctx, ttr, ts)
    if err := ttWorker.Start(); err != nil {
        slog.Error("Failed to start transaction template worker", "err", err)
    }

    // 4. Initialize budget template worker
    btWorker := workers.NewBudgetTemplateWorker(ctx, btr, budgetService)
    if err := btWorker.Start(); err != nil {
        slog.Error("Failed to start budget template worker", "err", err)
    }

    // 5. Return cleanup function
    return func() {
        slog.Info("Stopping all workers")
        ttWorker.Stop()
        btWorker.Stop()
    }
}
```

**Purpose:** Initialize background workers for scheduled/async tasks

**Workers registered:**

- TransactionTemplateWorker (hourly, creates recurring transactions)
- BudgetTemplateWorker (daily, creates recurring budgets)

**Return value:** Cleanup function that stops all workers

**Error handling:** Log errors if worker startup fails (non-fatal)

**Called from:** main.go line 42: `stopWorkers := internal.RegisterWorker(ctx, pool)`

**Called again in shutdown:** main.go line 60: `stopWorkers()`

---

## Resource Route Registration Pattern

Each resource implements `.Routes()` method to register its HTTP operations:

```go
func (r *AccountResource) Routes(api huma.API) {
    huma.Get(api, "GET /accounts", r.List)
    huma.Get(api, "GET /accounts/{id}", r.Get)
    huma.Post(api, "POST /accounts", r.Create)
    huma.Put(api, "PUT /accounts/{id}", r.Update)
    huma.Delete(api, "DELETE /accounts/{id}", r.Delete)
}
```

**Huma decorators:**

- `huma.Get(api, path, handler)` - GET request
- `huma.Post(api, path, handler)` - POST request
- `huma.Put(api, path, handler)` - PUT request
- `huma.Patch(api, path, handler)` - PATCH request
- `huma.Delete(api, path, handler)` - DELETE request

**Path variables:**

- `{id}` - Path parameter, accessible in request struct
- `?param=value` - Query parameters, struct tags define these

**Handler signature:**

```go
func (r *AccountResource) Get(ctx context.Context, params *struct {
    ID int64 `path:"id" doc:"Account ID"`
}) (*struct {
    Body models.AccountModel
}, error)
```

---

## Shutdown Sequence

When OS signal received (SIGTERM/SIGINT):

```
1. signal.NotifyContext() cancels context
2. ctx.Done() unblocks in main()
3. "Shutting down HTTP server" logged
4. stopWorkers() called
   ├─ ttWorker.Stop() → cancels worker context
   ├─ btWorker.Stop() → cancels worker context
5. srv.Shutdown(ctx) with 10s timeout
   ├─ Stop accepting new connections
   ├─ Wait for in-flight requests
   ├─ Close connections if timeout
6. "Server stopped" logged OR shutdown error logged
7. main() returns, process exits
```

**Graceful shutdown ensures:**

- Workers finish processing current tasks
- In-flight HTTP requests complete
- Database connections closed properly
- No data corruption from abrupt termination

---

## Configuration (configs/)

Configuration is loaded from environment variables and files:

**Environment variables:**

- `DATABASE_URL` - PostgreSQL connection string
- `APP_PORT` - HTTP server port (default: 8000)
- `JWT_SECRET` - Secret key for token signing
- `ENVIRONMENT` - development/production

**Database configuration (database.go):**

```go
db := configs.NewDatabase(env)
pool, _ := db.Connect(ctx)  // pgxpool.Pool with connection pooling
```

**OpenAPI configuration (openapi.go):**

```go
openapi := configs.NewOpenApi(env)  // API title, version, description
```

**Migrations configuration (migrations.go):**

```go
configs.RunMigration(env)  // Runs all *.up.sql files in order
```

---

## Huma Framework Integration

Huma is a modern REST API framework that:

1. **Automatic OpenAPI schema generation** from struct tags
2. **Request/response marshaling** (JSON)
3. **Route registration** via decorators
4. **Middleware support** via UseMiddleware()
5. **Error handling** with standardized error responses

**In this codebase:**

```go
// Initialize Huma with HTTP mux and OpenAPI config
humaSvr := humago.New(svr, configs.NewOpenApi(env))

// Add middleware
huma.UseMiddleware(...)

// Register routes via decorators
huma.Get(api, "GET /path", handler)
huma.Post(api, "POST /path", handler)
```

**OpenAPI output:**

- Available at `/openapi.json` or `/openapi.yaml`
- Automatically includes all routes, parameters, request/response schemas
- Generated from struct tags (`query:`, `path:`, `body:`, `json:`, `doc:`, `required:`, etc.)
