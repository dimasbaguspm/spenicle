# Main and Handlers

## Application Entry Point (cmd/app/main.go)

The `main()` function orchestrates application startup, dependency initialization, and graceful shutdown.

### Main Function Flow

```go
func main() {
    // 1. Create cancellable context
    ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
    defer stop()

    // 2. Initialize structured logging (JSON format)
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    }))
    slog.SetDefault(logger)

    // 3. Load configuration from environment
    env := configs.NewEnvironment()

    // 4. Initialize database connection pool
    db := configs.NewDatabase(ctx, env)

    // 5. Initialize Redis client for caching and rate limiting
    rdb := configs.NewRedisClient(ctx, env)

    // 6. Initialize HTTP mux
    svr := http.NewServeMux()

    // 7. Initialize Huma API framework
    humaSvr := humago.New(svr, configs.NewOpenApi(svr, env))

    // 8. Register public routes (includes /metrics, /health)
    internal.RegisterPublicRoutes(ctx, svr, humaSvr, db, rdb)

    // 9. Register private routes (authenticated, includes SessionMiddleware)
    internal.RegisterPrivateRoutes(ctx, humaSvr, db, rdb)

    // 10. Register background workers
    cleanupWorkers := internal.RegisterWorkers(ctx, db, rdb)

    // 11. Start HTTP server with middleware stack
    srv := &http.Server{
        Addr: fmt.Sprintf(":%s", env.AppPort),
        Handler: middleware.RateLimitMiddleware(env, rdb)(
            middleware.ObservabilityMiddleware(
                middleware.CORS(svr)
            )
        ),
    }

    slog.Info("Server is running at port", "port", env.AppPort)

    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            slog.Error("HTTP server error", "err", err)
        }
    }()

    // 12. Wait for OS signal
    <-ctx.Done()
    slog.Info("Shutting down HTTP server")

    // 13. Gracefully shutdown HTTP server (10s timeout)
    shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    defer cleanupWorkers()  // Stop workers after HTTP server

    if err := srv.Shutdown(shutdownCtx); err != nil {
        slog.Error("Graceful shutdown failed, forcing exit", "err", err)
    } else {
        slog.Info("Server stopped")
    }
}
```

### Initialization Order (Important!)

1. **Context** - Required for cancellation
2. **Structured Logging** - JSON handler for production logging
3. **Config** - Environment variables (DATABASE_URL, APP_PORT, JWT_SECRET, etc.)
4. **Database** - PostgreSQL connection pool (pgxpool)
5. **Redis** - Cache and rate limiter backend
6. **HTTP Mux** - Routing infrastructure
7. **Huma** - API framework with OpenAPI generation
8. **Public Routes** - Unauthenticated endpoints + /metrics + /health
9. **Private Routes** - Authenticated endpoints (SessionMiddleware applied in scope)
10. **Workers** - Background tasks (transaction templates, budget templates)
11. **HTTP Server** - Start with middleware stack (RateLimit → Observability → CORS)

**Why this order matters:**

- Database and Redis must be initialized before routes (repositories and services need them)
- Huma before routes (routes register via Huma API)
- Public routes before private (public includes /metrics, /health at mux level)
- Workers after routes (workers call services)
- Middleware stack wraps entire server (applied in main.go, not in handlers.go)

## Handlers Registration (internal/handlers.go)

Route registration is centralized in `internal/handlers.go` with three main functions using RootRepository and RootService aggregates.

### RegisterPublicRoutes()

```go
func RegisterPublicRoutes(ctx context.Context, svr *http.ServeMux, huma huma.API, db *pgxpool.Pool, rdb *redis.Client) {
    // 1. Register /metrics endpoint (Prometheus)
    svr.Handle("/metrics", promhttp.Handler())

    // 2. Register /health endpoint
    svr.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    // 3. Create repository and service aggregates
    rpts := repositories.NewRootRepository(ctx, db)
    sevs := services.NewRootService(rpts, rdb)

    // 4. Register auth resource (unauthenticated)
    resources.NewAuthResource(sevs.Ath).Routes(huma)
}
```

**Purpose:** Register unauthenticated routes and monitoring endpoints

**Routes registered:**

- `/metrics` - Prometheus metrics (via promhttp.Handler)
- `/health` - Health check endpoint (returns HTTP 200 "OK")
- `POST /auth/login` - User authentication
- `POST /auth/signup` - User registration
- `POST /auth/logout` - User logout

**Note:** /metrics and /health are registered at mux level (not Huma), so they bypass middleware stack except ObservabilityMiddleware and CORS

**Why separate:** SessionMiddleware is NOT applied to these routes

**Dependency Pattern:**

```
RootRepository → RootService → AuthService → AuthResource → Routes
```

**Called from:** main.go line 36

---

### RegisterPrivateRoutes()

```go
func RegisterPrivateRoutes(ctx context.Context, huma huma.API, db *pgxpool.Pool, rdb *redis.Client) {
    // 1. Apply SessionMiddleware to all routes in this scope
    huma.UseMiddleware(middleware.SessionMiddleware(huma))

    // 2. Create repository and service aggregates
    rpts := repositories.NewRootRepository(ctx, db)
    sevs := services.NewRootService(rpts, rdb)

    // 3. Register all resources (each receives full RootService)
    resources.NewAccountResource(sevs).Routes(huma)
    resources.NewCategoryResource(sevs).Routes(huma)
    resources.NewAccountStatisticsResource(sevs).Routes(huma)
    resources.NewCategoryStatisticsResource(sevs).Routes(huma)
    resources.NewTransactionResource(sevs).Routes(huma)
    resources.NewSummaryResource(sevs).Routes(huma)
    resources.NewBudgetResource(sevs).Routes(huma)
    resources.NewBudgetTemplateResource(sevs).Routes(huma)
    resources.NewTagResource(sevs).Routes(huma)
    resources.NewSeedResource(db, rdb).Routes(huma)  // Special: receives db/rdb directly
}
```

**Purpose:** Register authenticated routes (SessionMiddleware required)

**Middleware applied:** SessionMiddleware (validates JWT token in scope)

**Routes registered:**

- Account operations (CRUD + archive)
- Category operations (CRUD + archive)
- Account statistics (time frequency heatmap, monthly velocity, etc.)
- Category statistics (breakdown, trends)
- Transaction operations (CRUD + relations + tags + templates)
- Summary operations (dashboard aggregations)
- Budget operations (CRUD + tracking)
- Budget template operations (CRUD + recurring budgets)
- Tag operations (CRUD + transaction tagging)
- Seed operations (development data seeding)

**Dependency Pattern:**

```
RootRepository → RootService → All Services → Resources → Routes
                      ↓
                 Redis Client
```

**Key difference from old pattern:**
- Old: Each service created individually with specific repository
- New: Single RootService aggregate created once, all resources receive it
- Benefit: Resources can access multiple services easily for cross-entity operations

**Called from:** main.go line 37

---

### RegisterWorkers()

```go
func RegisterWorkers(ctx context.Context, db *pgxpool.Pool, rdb *redis.Client) func() {
    // 1. Create repository and service aggregates
    rpts := repositories.NewRootRepository(ctx, db)
    sevs := services.NewRootService(rpts, rdb)

    // 2. Initialize transaction template worker
    ttWorker := workers.NewTransactionTemplateWorker(ctx, rpts.TsctTem, sevs.Tsct, rdb)
    btWorker := workers.NewBudgetTemplateWorker(ctx, rpts.BudgTem, sevs.Budg, rdb)

    // 3. Start workers
    ttWorker.Start()
    btWorker.Start()

    // 4. Return cleanup function
    return func() {
        slog.Info("Stopping all workers")
        ttWorker.Stop()
        btWorker.Stop()
    }
}
```

**Purpose:** Initialize background workers for scheduled/async tasks

**Workers registered:**

- **TransactionTemplateWorker** - Processes recurring transaction templates (hourly)
  - Receives: context, TransactionTemplateRepository, TransactionService, Redis client
  - Creates transactions from templates based on recurrence rules
  - Updates `last_executed_at` timestamp
  - Invalidates transaction caches after processing

- **BudgetTemplateWorker** - Creates budgets from templates (daily)
  - Receives: context, BudgetTemplateRepository, BudgetService, Redis client
  - Creates budget periods from templates (weekly/monthly/yearly)
  - Calculates period start/end dates
  - Updates `last_executed_at` timestamp
  - Invalidates budget caches after processing

**Return value:** Cleanup function (stops all workers)

**Error handling:** Workers use fault-tolerant pattern (errors logged, don't crash worker)

**Called from:** main.go line 38: `cleanupWorkers := internal.RegisterWorkers(ctx, db, rdb)`

**Called again in shutdown:** main.go line 58: `defer cleanupWorkers()` (after HTTP server shutdown)

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
