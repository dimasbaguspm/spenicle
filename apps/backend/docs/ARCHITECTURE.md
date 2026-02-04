# Backend Architecture

## Overview

The Spenicle backend is a Go REST API built with clean layered architecture. It follows the **Repository → Service → Resource** pattern with centralized dependency injection, Redis caching, observability infrastructure, and background worker support.

**Technology Stack:**

- **Framework:** Huma v2 (REST API framework)
- **Database:** PostgreSQL with pgxpool connection pooling
- **Cache:** Redis 8.4+ (caching layer with TTL management)
- **HTTP Server:** Go net/http with graceful shutdown
- **Concurrency:** Goroutines with sync.WaitGroup and context cancellation
- **Migrations:** SQL-based versioning system
- **Observability:** Prometheus metrics, structured logging (slog), request tracing
- **Rate Limiting:** Redis-based sliding window (production only)

## Layered Architecture

```
HTTP Request
    ↓
Middleware Stack (4 layers)
    ├─ ObservabilityMiddleware (request ID, logging, metrics)
    ├─ RateLimitMiddleware (Redis-based, 100 req/min, production only)
    ├─ CORS Middleware (origin validation)
    └─ SessionMiddleware (JWT validation, private routes only)
    ↓
Resource Layer (HTTP handlers)
    ↓
Service Layer (business logic + cache invalidation)
    ↓
Cache Layer (Redis)
    ├─ Cache Hit → Return cached data
    └─ Cache Miss → Fetch from Repository
    ↓
Repository Layer (data access)
    ↓
Database (PostgreSQL)
```

### Layer Responsibilities

**Resource Layer** (`internal/resources/`)

- HTTP endpoint definitions using Huma decorators
- Request/Response marshaling
- Route registration via `.Routes(huma)` method
- Receives RootService aggregate with all services
- Example: `AccountResource.Routes()` registers GET/POST/PUT/DELETE /accounts

**Service Layer** (`internal/services/`)

- Business logic and validation
- Cache invalidation after mutations
- Cross-entity coordination (e.g., updating account balance during transaction creation)
- Error handling and transformation
- Organized via RootService aggregate pattern
- Example: `TransactionService.Create()` handles:
  1. Transaction creation via repository
  2. Account balance updates based on transaction type
  3. Cache invalidation for affected resources
  4. Return formatted response

**Cache Layer** (Redis via `internal/common/cache.go`)

- Generic caching helpers: `FetchWithCache[T]()`, `SetCache()`, `GetCache()`, `InvalidateCache()`
- TTL-based cache expiration (configurable per resource)
- Cache key generation with `BuildCacheKey()`
- Prometheus metrics tracking (cache hits/misses per resource)
- Pattern: Check cache → On miss, fetch from repository → Cache result

**Repository Layer** (`internal/repositories/`)

- Data access and SQL queries
- Result mapping to models
- Transaction support with `WithTx()` method
- Organized via RootRepository aggregate pattern
- Small `DBQuerier` interface (Query/QueryRow/Exec) for flexibility
- Example: `TransactionRepository.Create()` executes SQL INSERT and returns model

**Model Layer** (`internal/models/`)

- Request/Response DTOs (struct definitions with tags)
- Database model representations
- OpenAPI schema integration via struct tags

## Dependency Injection Pattern

Dependencies are centrally wired at startup in `internal/handlers.go` using aggregate patterns:

### RootRepository Aggregate

Located in `internal/repositories/root_repository.go`:

```go
type RootRepository struct {
    Pool    *pgxpool.Pool
    Acc     AccountRepository
    Ath     AuthRepository
    Budg    BudgetRepository
    BudgTem BudgetTemplateRepository
    Cat     CategoryRepository
    AccStat AccountStatisticsRepository
    CatStat CategoryStatisticsRepository
    Sum     SummaryRepository
    Tag     TagRepository
    Tsct    TransactionRepository
    TsctRel TransactionRelationRepository
    TsctTag TransactionTagRepository
    TsctTem TransactionTemplateRepository
}

// Usage
rpts := repositories.NewRootRepository(ctx, pool)
```

**Benefits:**
- Single initialization point for all repositories
- Transaction support via `WithTx(ctx, tx)` creates new aggregate with same transaction
- Centralized DBQuerier interface injection

### RootService Aggregate

Located in `internal/services/root_service.go`:

```go
type RootService struct {
    Acc     AccountService
    AccStat AccountStatisticsService
    Ath     AuthService
    Budg    BudgetService
    BudgTem BudgetTemplateService
    Cat     CategoryService
    CatStat CategoryStatisticsService
    Sum     SummaryService
    Tag     TagService
    Tsct    TransactionService
    TsctRel TransactionRelationService
    TsctTag TransactionTagService
    TsctTem TransactionTemplateService
}

// Usage
sevs := services.NewRootService(rpts, rdb)
```

**Benefits:**
- Single initialization point for all services
- All services receive RootRepository pointer and Redis client
- Resources receive entire RootService, access specific services via fields
- Simplifies cross-service coordination

### Wiring Pattern (from `handlers.go`)

1. **Public Routes** (unauthenticated):

   ```go
   rpts := repositories.NewRootRepository(ctx, db)
   sevs := services.NewRootService(rpts, rdb)
   resources.NewAuthResource(sevs.Ath).Routes(huma)
   ```

2. **Private Routes** (authenticated via SessionMiddleware):

   ```go
   rpts := repositories.NewRootRepository(ctx, db)
   sevs := services.NewRootService(rpts, rdb)

   resources.NewAccountResource(sevs).Routes(huma)
   resources.NewCategoryResource(sevs).Routes(huma)
   resources.NewTransactionResource(sevs).Routes(huma)
   // ... other resources receive full RootService
   ```

3. **Workers**:
   ```go
   rpts := repositories.NewRootRepository(ctx, db)
   sevs := services.NewRootService(rpts, rdb)

   ttWorker := workers.NewTransactionTemplateWorker(ctx, rpts.TsctTem, sevs.Tsct, rdb)
   btWorker := workers.NewBudgetTemplateWorker(ctx, rpts.BudgTem, sevs.Budg, rdb)
   ```

## Middleware Stack

Middleware is applied in 4 layers (see `cmd/app/main.go:42`):

```go
srv := &http.Server{
    Handler: middleware.RateLimitMiddleware(env, rdb)(
        middleware.ObservabilityMiddleware(
            middleware.CORS(svr)
        )
    ),
}
```

**Execution order** (outer to inner):

1. **ObservabilityMiddleware** (`internal/middleware/observability_middleware.go`) - Applied globally

   - Generates unique request ID per request
   - Structured logging with slog (request start/completion)
   - Prometheus metrics:
     - `requests_total` (method, status, path)
     - `request_duration_seconds` (method, path)
     - `last_request_time` (method, path)
     - `http_errors_total` (status, method, path) for 4xx/5xx
   - Request ID available in context via `observability.RequestIDKey`

2. **RateLimitMiddleware** (`internal/middleware/rate_limiter_middleware.go`) - Applied globally

   - **Production only** (disabled in development via `env.AppStage` check)
   - Redis-based sliding window algorithm
   - 100 requests per minute per IP address
   - Atomic operations using Redis INCR + EXPIRE
   - Returns HTTP 429 (Too Many Requests) when exceeded
   - Response headers:
     - `X-RateLimit-Limit: 100`
     - `X-RateLimit-Remaining: N`
     - `X-RateLimit-Reset: N` (seconds until reset)
     - `Retry-After: N` (when rate limited)

3. **CORS Middleware** (`internal/middleware/cors_middleware.go`) - Applied globally

   - Validates Origin header against allowlist
   - Sets Access-Control headers for cross-origin requests
   - Allowed origins: `http://localhost:3000` (configurable)
   - Allowed methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
   - Credentials enabled

4. **SessionMiddleware** (`internal/middleware/session_middleware.go`) - Applied to private routes only
   - Extracts Bearer token from Authorization header
   - Validates JWT signature and expiration via `AuthRepository.ParseToken()`
   - Rejects request if invalid/missing (HTTP 401)
   - Applied via `huma.UseMiddleware()` in `RegisterPrivateRoutes()` scope

## Request Flow Example: Create Transaction

```
1. POST /transactions {type, amount, accountID}
   ↓
2. ObservabilityMiddleware
   - Generates request ID
   - Logs incoming request
   - Starts metrics timer
   ↓
3. RateLimitMiddleware (production only)
   - Check Redis for request count by IP
   - Return 429 if > 100 req/min
   ↓
4. CORS Middleware validates origin
   ↓
5. SessionMiddleware extracts and validates Bearer token
   ↓
6. TransactionResource.Post() receives request
   ↓
7. TransactionService.Create(ctx, request) processes:
   - Creates transaction record via repository
   - Updates source account balance
   - Updates destination account balance (if transfer)
   - Updates transaction-tag relationships
   - Invalidates caches: transactions, accounts, account statistics
   ↓
8. TransactionRepository.Create(ctx, request) executes:
   - SQL INSERT into transactions table
   - Returns created transaction model
   ↓
9. ObservabilityMiddleware logs completion + records metrics
   ↓
10. Resource returns CreateTransactionResponseModel (HTTP 201)
```

## Background Workers

Separate layer for scheduled/async tasks:

- **CronWorker** - Manages scheduled recurring tasks

  - Registers tasks with fixed intervals
  - Each task runs in independent goroutine with dedicated ticker
  - Graceful shutdown via context cancellation

- **QueueWorker** - Manages async job queue (reserved for future use)
  - Enqueue jobs non-blocking
  - Process with configurable worker concurrency
  - Drain queue before shutdown

## Database Design

**Schema Organization:**

- 8 core tables: accounts, categories, transactions, transaction_relations, tags, transaction_tags, budgets, budget_templates, transaction_templates
- Soft deletes via deleted_at timestamp column
- Foreign key constraints with CASCADE DELETE
- ~30 optimized indexes for common queries
- Proper CHECK constraints on enums

**Data Consistency:**

- Account balance maintained through transaction operations
- Transaction relations track splits and groups
- Template tracking via last_executed_at field
- Period calculations for recurring budgets

## Caching Strategy

### Cache Infrastructure

- **Backend:** Redis 8.4+ with go-redis/v9 client
- **Initialization:** `configs.NewRedisClient(ctx, env)` in main.go
- **Thread-safe:** redis.Client is safe for concurrent use across goroutines

### Caching Utilities (`internal/common/cache.go`)

```go
// Generic fetch with automatic caching
FetchWithCache[T any](ctx, rdb, cacheKey, ttl, fetcher, resourceLabel) (T, error)

// Manual cache operations
SetCache[T any](ctx, rdb, key, value, ttl) error
GetCache[T any](ctx, rdb, key) (T, error)
InvalidateCache(ctx, rdb, pattern) error  // Pattern matching with wildcards
BuildCacheKey(id, params, parts...) string  // Consistent key generation
```

### Cache Keys Pattern

Format: `{resource}:{id}:{params_json}`

Examples:
- `accounts:123:{"pageNumber":1,"pageSize":10}`
- `categories:*` (wildcard for invalidation)
- `account_statistics:456:{"period":"monthly"}`

### TTL Configuration (Common Patterns)

- **List queries:** 5-15 minutes
- **Single entity:** 10-30 minutes
- **Statistics/aggregations:** 5-10 minutes
- **Summary data:** 5 minutes

### Cache Invalidation Strategy

**When to invalidate:**
- After Create operations: Invalidate list caches for that resource
- After Update operations: Invalidate specific entity + list caches
- After Delete operations: Invalidate specific entity + list caches
- Cross-entity impacts: Invalidate related resources (e.g., transaction affects account balances)

**Example from TransactionService:**
```go
// After creating transaction
common.InvalidateCache(ctx, s.rdb, "transactions:*")
common.InvalidateCache(ctx, s.rdb, "accounts:*")
common.InvalidateCache(ctx, s.rdb, "account_statistics:*")
```

### Prometheus Metrics

Tracked in `internal/observability/metrics.go`:
- `cache_hits_total` (resource label)
- `cache_misses_total` (resource label)

Automatically incremented by `FetchWithCache()` helper.

## Observability Infrastructure

### Structured Logging

- **Package:** `log/slog` (Go standard library)
- **Format:** JSON for production parsing
- **Level:** Info (configurable)
- **Request context:** Request ID attached to all logs via ObservabilityMiddleware

### Prometheus Metrics

Exposed at `/metrics` endpoint (handled via `promhttp.Handler()`):

**Request Metrics:**
- `requests_total` (counter) - Labels: method, status, path
- `request_duration_seconds` (histogram) - Labels: method, path
- `last_request_time` (gauge) - Labels: method, path
- `http_errors_total` (counter) - Labels: status, method, path

**Cache Metrics:**
- `cache_hits_total` (counter) - Labels: resource
- `cache_misses_total` (counter) - Labels: resource

**Defined in:** `internal/observability/metrics.go`

### Request Tracing

Each request assigned unique ID via `observability.GenerateID()`:
- Stored in context: `context.WithValue(ctx, observability.RequestIDKey, requestID)`
- Logged at request start and completion
- Duration tracking in milliseconds

## Graceful Shutdown

Shutdown sequence (cmd/app/main.go):

```
1. OS signal received (Interrupt/SIGTERM)
2. context cancelled via signal.NotifyContext
3. HTTP server.Shutdown(ctx) with 10s timeout:
   - Stop accepting new connections
   - Wait for in-flight requests to complete
4. Cleanup workers via deferred function:
   - TransactionTemplateWorker.Stop() cancels context, waits for goroutines
   - BudgetTemplateWorker.Stop() cancels context, waits for goroutines
5. Application exits
```

**Note:** Workers stopped via defer after HTTP server shutdown (line 58)

## Error Handling

- Repository errors wrapped with context using `fmt.Errorf("%w", err)`
- Service layer transforms to HTTP-appropriate errors
- Resource layer uses Huma error helpers: `huma.Error400BadRequest()`, `huma.Error404NotFound()`, etc.
- Worker errors logged via slog but don't crash worker (fault-tolerant)
