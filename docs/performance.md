# Performance Guide

## Overview

This document defines performance patterns, constraints, and best practices for the Spenicle API to ensure optimal performance, scalability, and resource utilization.

## Pagination

### Page Size Limits

**Maximum page size**: 100 items per request

**Default page size**: 30 items

**Rationale**: Prevents excessive memory consumption and ensures consistent response times.

### Implementation Pattern

**Service Layer** (handles validation and defaults):

```go
func (s *AccountService) List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
    maxPageSize     = 100
    defaultPageSize = 25

    // Enforce maximum page size
    if params.PageSize > maxPageSize {
        params.PageSize = maxPageSize
    }
    if params.PageSize <= 0 {
        params.PageSize = defaultPageSize
    }

    // Ensure valid page number
    if params.PageNumber <= 0 {
        params.PageNumber = 1
    }

    return s.store.List(ctx, params)
}
```

**Repository Layer** (trusts service layer inputs):

```go
// List returns paginated accounts
// Trust the service layer to validate pageSize and pageNumber
func (r *AccountRepository) List(ctx context.Context, params schemas.SearchParamAccountSchema) (schemas.PaginatedAccountSchema, error) {
    // No validation here - trust service layer
    offset := (params.PageNumber - 1) * params.PageSize
    rows, _ := r.db.Query(ctx, sql, params.PageSize, offset)
    // ...
}
```

**Architectural Note**: Validation belongs in the service layer. Repositories should focus purely on database operations and trust their inputs. This maintains clear separation of concerns.

### Response Format

All paginated endpoints should return:

- `items`: Array of results
- `total`: Total count of items
- `page`: Current page number
- `page_size`: Items per page
- `total_pages`: Total number of pages

### Database Query Pattern

Use `LIMIT` and `OFFSET` with total count:

```go
// Get total count
countQuery := "SELECT COUNT(*) FROM accounts WHERE ..."
var total int
_ = db.QueryRow(ctx, countQuery, args...).Scan(&total)

// Get paginated results
dataQuery := "SELECT * FROM accounts WHERE ... LIMIT $1 OFFSET $2"
rows, _ := db.Query(ctx, dataQuery, pageSize, offset)
```

**Performance tip**: For large datasets (>10k rows), consider cursor-based pagination instead of offset-based.

## Query Optimization

### Indexing Strategy

**Always index**:

- Primary keys (automatic)
- Foreign keys
- Columns used in WHERE clauses
- Columns used in ORDER BY
- Columns used in JOIN conditions

**Example**:

```sql
-- Index for account searches by user_id and name
CREATE INDEX idx_accounts_user_name ON accounts(user_id, name);

-- Partial index for active accounts only
CREATE INDEX idx_accounts_active ON accounts(user_id) WHERE deleted_at IS NULL;
```

### N+1 Query Prevention

**Bad**: Loading related data in loops

```go
// DON'T DO THIS - N+1 queries
for _, account := range accounts {
    user, _ := userRepo.GetByID(ctx, account.UserID)
    // ...
}
```

**Good**: Use JOINs or batch loading

```go
// DO THIS - Single query with JOIN
SELECT a.*, u.name as user_name
FROM accounts a
LEFT JOIN users u ON a.user_id = u.id
WHERE a.user_id = $1
```

### Query Patterns

**Use prepared statements** (pgx does this automatically):

```go
// pgx automatically prepares and caches statements
rows, err := db.Query(ctx, "SELECT * FROM accounts WHERE user_id = $1", userID)
```

**Avoid SELECT \***:

```go
// Bad - selects unnecessary columns
"SELECT * FROM accounts"

// Good - select only needed columns
"SELECT id, name, type, balance FROM accounts"
```

**Use WHERE conditions wisely**:

```go
// Use indexed columns in WHERE clause
"WHERE user_id = $1 AND deleted_at IS NULL"

// Avoid functions on indexed columns (prevents index usage)
// Bad: "WHERE LOWER(name) = $1"
// Good: "WHERE name ILIKE $1"
```

## Timeout Configuration

### Request Timeouts

**HTTP Server**:

```go
srv := &http.Server{
    Addr:           ":8080",
    Handler:        router,
    ReadTimeout:    10 * time.Second,  // Time to read request
    WriteTimeout:   30 * time.Second,  // Time to write response
    IdleTimeout:    120 * time.Second, // Keep-alive timeout
    MaxHeaderBytes: 1 << 20,           // 1 MB
}
```

**Context Timeouts**:

```go
// For database operations
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()

rows, err := db.Query(ctx, query, args...)
```

### Recommended Timeouts

| Operation          | Timeout | Rationale                          |
| ------------------ | ------- | ---------------------------------- |
| Simple SELECT      | 5s      | Should be fast with proper indexes |
| Complex JOIN       | 10s     | May involve multiple tables        |
| INSERT/UPDATE      | 5s      | Should complete quickly            |
| DELETE             | 5s      | Usually fast unless cascading      |
| Transaction        | 10s     | Multiple operations                |
| External API calls | 30s     | Network latency                    |

### Implementation in Handlers

```go
func (ar *AccountResource) Get(ctx context.Context, input *getAccountRequest) (*getAccountResponse, error) {
    // Add timeout to context
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    account, err := ar.service.Get(ctx, input.ID)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return nil, huma.Error504GatewayTimeout("request timeout")
        }
        // ... other error handling
    }

    return &getAccountResponse{Status: http.StatusOK, Body: account}, nil
}
```

## Transaction Management

### When to Use Transactions

**Use transactions for**:

- Multiple related writes that must succeed or fail together
- Operations that read then write based on the read value
- Any operation that must maintain data consistency

**Don't use transactions for**:

- Single INSERT/UPDATE/DELETE operations (already atomic)
- Read-only operations
- Long-running operations (holds locks)

### Transaction Pattern

```go
// Begin transaction
tx, err := db.Begin(ctx)
if err != nil {
    return fmt.Errorf("begin transaction: %w", err)
}
defer tx.Rollback(ctx) // Rollback if not committed

// Perform operations
_, err = tx.Exec(ctx, "INSERT INTO accounts (...) VALUES (...)", args...)
if err != nil {
    return fmt.Errorf("insert account: %w", err)
}

_, err = tx.Exec(ctx, "UPDATE users SET account_count = account_count + 1 WHERE id = $1", userID)
if err != nil {
    return fmt.Errorf("update user: %w", err)
}

// Commit transaction
if err = tx.Commit(ctx); err != nil {
    return fmt.Errorf("commit transaction: %w", err)
}

return nil
```

### Transaction Best Practices

1. **Keep transactions short**: Long transactions hold locks and block other operations
2. **Set transaction timeout**: Prevent runaway transactions
   ```go
   ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
   defer cancel()
   tx, err := db.Begin(ctx)
   ```
3. **Use appropriate isolation level**: PostgreSQL default (Read Committed) is fine for most cases
4. **Avoid external calls in transactions**: Don't make HTTP requests or long computations inside transactions
5. **Always defer Rollback**: Ensures cleanup even if function returns early

### Repository Pattern with Transactions

```go
type AccountRepository struct {
    db DB // Interface supporting both *pgxpool.Pool and pgx.Tx
}

// DB interface allows using both connection pool and transactions
type DB interface {
    Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error)
    QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row
    Exec(ctx context.Context, sql string, args ...interface{}) (pgconn.CommandTag, error)
}

// Service method using transaction
func (s *AccountService) TransferBalance(ctx context.Context, fromID, toID int64, amount decimal.Decimal) error {
    tx, err := s.pool.Begin(ctx)
    if err != nil {
        return err
    }
    defer tx.Rollback(ctx)

    // Use transaction-aware repository
    repo := NewAccountRepository(tx)

    // Deduct from source account
    if err := repo.UpdateBalance(ctx, fromID, amount.Neg()); err != nil {
        return err
    }

    // Add to destination account
    if err := repo.UpdateBalance(ctx, toID, amount); err != nil {
        return err
    }

    return tx.Commit(ctx)
}
```

## Database Connection Pooling

### Pool Configuration

Configure connection pool in `internal/database/database.go`:

```go
func (d *Database) Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
    config, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, fmt.Errorf("parse database URL: %w", err)
    }

    // Pool configuration
    config.MaxConns = 25              // Maximum connections in pool
    config.MinConns = 5               // Minimum idle connections
    config.MaxConnLifetime = 1 * time.Hour     // Max connection lifetime
    config.MaxConnIdleTime = 30 * time.Minute  // Max idle time before closing
    config.HealthCheckPeriod = 1 * time.Minute // Health check frequency

    // Connection timeout
    config.ConnConfig.ConnectTimeout = 10 * time.Second

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, fmt.Errorf("create connection pool: %w", err)
    }

    // Verify connection
    if err := pool.Ping(ctx); err != nil {
        return nil, fmt.Errorf("ping database: %w", err)
    }

    return pool, nil
}
```

### Pool Size Recommendations

**Formula**: `connections = ((core_count * 2) + effective_spindle_count)`

**Typical configurations**:

- **Development**: MaxConns = 10, MinConns = 2
- **Staging**: MaxConns = 25, MinConns = 5
- **Production (small)**: MaxConns = 50, MinConns = 10
- **Production (large)**: MaxConns = 100, MinConns = 20

**Factors to consider**:

- Database server resources (CPU, memory)
- Number of application instances
- Average query duration
- Expected concurrent users

### Monitoring Pool Health

```go
// Get pool statistics
stats := pool.Stat()
log.Info("pool stats",
    "total_conns", stats.TotalConns(),
    "idle_conns", stats.IdleConns(),
    "acquired_conns", stats.AcquiredConns(),
)
```

**Key metrics to monitor**:

- `AcquiredConns`: Currently in use (should be < MaxConns)
- `IdleConns`: Available for use
- `AcquireCount`: Total acquisitions (rate of requests)
- `AcquireDuration`: Time to acquire connection (should be low)

## Caching Strategy

### When to Cache

**Good candidates for caching**:

- Reference data (rarely changes): countries, categories, settings
- Expensive computations: aggregations, reports
- Frequently accessed data: user profiles, popular content
- API responses for read-heavy endpoints

**Don't cache**:

- Frequently changing data: real-time balances, status
- User-specific data (unless isolated per user)
- Data requiring strong consistency

### Caching Layers

**1. In-Memory Cache** (for small, shared data):

```go
var settingsCache sync.Map

func GetSettings(ctx context.Context) (*Settings, error) {
    if cached, ok := settingsCache.Load("settings"); ok {
        return cached.(*Settings), nil
    }

    settings, err := fetchSettingsFromDB(ctx)
    if err != nil {
        return nil, err
    }

    settingsCache.Store("settings", settings)
    return settings, nil
}
```

**2. Redis Cache** (for distributed caching):

```go
// Future enhancement - not yet implemented
// Use Redis for distributed caching across multiple instances
```

### Cache Invalidation

**Strategies**:

1. **TTL (Time To Live)**: Expire after fixed duration
2. **Event-based**: Invalidate on updates
3. **Write-through**: Update cache on write
4. **Cache-aside**: Fetch from DB on miss, update cache

## Performance Monitoring

### Key Metrics to Track

**Application Metrics**:

- Request rate (requests per second)
- Response time (p50, p95, p99 percentiles)
- Error rate (percentage of failed requests)
- Concurrent connections

**Database Metrics**:

- Query duration
- Connection pool utilization
- Slow query count (>1s)
- Transaction duration
- Lock wait time

**System Metrics**:

- CPU usage
- Memory usage
- Disk I/O
- Network I/O

### Performance Testing

**Load Testing with k6**:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests under 500ms
    http_req_failed: ["rate<0.01"], // Error rate < 1%
  },
};

export default function () {
  let res = http.get("http://localhost:8080/accounts");
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Performance Checklist

- [ ] All database queries use indexes for WHERE/JOIN columns
- [ ] Pagination implemented with max page size limit (100)
- [ ] Timeouts configured for all external operations
- [ ] Transactions kept short and scoped appropriately
- [ ] Connection pool sized appropriately for load
- [ ] Slow queries identified and optimized (>1s)
- [ ] N+1 queries eliminated
- [ ] Response compression enabled for large payloads
- [ ] Caching implemented for frequently accessed data
- [ ] Load testing performed and benchmarks established

## Performance Targets

### Response Time SLOs

| Endpoint Type    | p50    | p95    | p99    |
| ---------------- | ------ | ------ | ------ |
| GET (simple)     | <50ms  | <100ms | <200ms |
| GET (complex)    | <100ms | <200ms | <500ms |
| POST/PUT         | <100ms | <250ms | <500ms |
| DELETE           | <50ms  | <100ms | <200ms |
| List (paginated) | <100ms | <300ms | <1s    |

### Throughput Targets

- **Sustained load**: 500 req/s per instance
- **Peak load**: 1000 req/s per instance
- **Error rate**: <0.1% under normal load
- **Availability**: 99.9% uptime (43 minutes downtime/month)

## Optimization Checklist by Layer

### Database Layer

- [ ] Indexes on frequently queried columns
- [ ] Query execution plans reviewed (EXPLAIN ANALYZE)
- [ ] Connection pool configured appropriately
- [ ] Slow query log enabled and monitored
- [ ] Foreign key constraints with proper indexes

### Service Layer

- [ ] Business logic optimized (no unnecessary loops)
- [ ] Batch operations where possible
- [ ] Caching for expensive computations
- [ ] Proper error handling (don't swallow errors)

### Resource Layer

- [ ] Input validation at schema level
- [ ] Appropriate timeout per endpoint
- [ ] Pagination enforced
- [ ] Response size limited
- [ ] Proper status codes returned

### Infrastructure

- [ ] Rate limiting enabled
- [ ] Response compression enabled
- [ ] HTTP/2 or HTTP/3 enabled
- [ ] Load balancer configured
- [ ] CDN for static assets

## Future Enhancements

**Planned improvements**:

1. Redis caching layer for distributed caching
2. Read replicas for read-heavy workloads
3. GraphQL for flexible querying
4. Cursor-based pagination for large datasets
5. Database query result caching
6. HTTP/2 server push for related resources
7. GraphQL DataLoader pattern for batch loading
8. Materialized views for complex aggregations
