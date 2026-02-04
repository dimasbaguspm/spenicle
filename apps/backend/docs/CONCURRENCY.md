# Concurrency

This backend uses Go's concurrency primitives for safe, non-blocking operations across multiple workers and HTTP requests.

## Concurrency Model

**Approach:** Goroutines + Channels + sync primitives

**Goals:**

1. Handle thousands of concurrent HTTP requests
2. Run scheduled background tasks non-blocking
3. Graceful shutdown with cleanup
4. No race conditions or deadlocks

## HTTP Request Concurrency

### Per-Request Context

Each HTTP request receives its own `context.Context`:

```go
func (r *AccountResource) List(ctx context.Context, params *Request) (*Response, error) {
    // ctx is unique to this request
    // Used for database operations, timeouts, cancellation
}
```

**Context propagation:**

```
HTTP Request
  ↓
Handler (ctx)
  ↓
Service.List(ctx)
  ↓
Repository.Query(ctx, sql)
  ↓
pgx.Query(ctx, sql)  ← cancellation propagates here
```

**Benefits:**

- Request cancellation: client disconnects → all operations stop
- Timeout support: query takes too long → context deadline exceeded
- Tracing: thread per-request data through call stack

### Database Connection Pooling

```go
pool, _ := db.Connect(ctx)  // pgxpool.Pool
```

**pgxpool.Pool:**

- Thread-safe connection pool
- Pre-allocated connections (default 4)
- Automatically routes queries to available connections
- Handles connection lifecycle
- Supports concurrent requests safely

**Usage:**

```go
// Multiple goroutines (HTTP requests) can safely use same pool
go func() {
    rows, _ := pool.Query(ctx, "SELECT ...")  // Request 1
}()

go func() {
    rows, _ := pool.Query(ctx, "SELECT ...")  // Request 2
}()
// Both run concurrently on different pool connections
```

### Redis Client Concurrency

```go
rdb := configs.NewRedisClient(ctx, env)  // *redis.Client
```

**redis.Client:**

- **Thread-safe** - safe for concurrent use across goroutines
- Connection pooling built-in
- Atomic operations (INCR, EXPIRE) for rate limiting
- Pipelining support for batch operations

**Usage:**

```go
// Multiple goroutines can safely use same Redis client
go func() {
    rdb.Get(ctx, "accounts:123")  // Request 1
}()

go func() {
    rdb.Set(ctx, "accounts:456", data, ttl)  // Request 2
}()

go func() {
    rdb.Incr(ctx, "rate_limit:127.0.0.1")  // Request 3 (atomic)
}()
// All operations safely concurrent
```

**Atomic operations for rate limiting:**

```go
// INCR is atomic - safe for concurrent rate limit checks
count, _ := rdb.Incr(ctx, redisKey).Result()
if count == 1 {
    rdb.Expire(ctx, redisKey, duration)  // Also atomic
}
```

No race conditions even with thousands of concurrent requests checking rate limits.

### HTTP Server Concurrency

Go's `http.Server` handles concurrent requests via goroutines:

```go
srv := &http.Server{
    Addr:    ":8000",
    Handler: svr,
}

go func() {
    srv.ListenAndServe()  // Spawns goroutine per request
}()
```

**One goroutine per HTTP request:**

- Handles request parsing
- Calls handler
- Returns response
- Goroutine exits

**Built-in safety:**

- No manual goroutine management needed
- Context cleanup automatic
- Connection cleanup automatic

## Worker Concurrency

### CronWorker Architecture

Located in `internal/common/cron_worker.go`

```go
type CronWorker struct {
    ctx      context.Context
    cancel   context.CancelFunc
    tasks    map[string]*scheduledTask
    taskMu   sync.RWMutex
    wg       sync.WaitGroup
    stopping int32
}
```

**Pattern:**

- One goroutine per scheduled task
- Each task has independent ticker
- Shared sync primitives for coordination

### Task Registration and Execution

```go
func (cw *CronWorker) Register(task CronTask) error {
    // Lock for safe map access
    cw.taskMu.Lock()
    if _, exists := cw.tasks[task.ID]; exists {
        cw.taskMu.Unlock()
        return fmt.Errorf("task already exists")
    }

    ticker := time.NewTicker(task.Schedule)
    cw.tasks[task.ID] = &scheduledTask{task, ticker}
    cw.taskMu.Unlock()

    // Spawn independent goroutine for this task
    cw.wg.Add(1)
    go cw.runTask(task, ticker)

    return nil
}

// Each task runs independently
func (cw *CronWorker) runTask(task CronTask, ticker *time.Ticker) {
    defer cw.wg.Done()
    defer ticker.Stop()

    for {
        select {
        case <-ticker.C:
            // Execute task (with timeout protection)
            taskCtx, cancel := context.WithTimeout(cw.ctx, 5*time.Minute)
            if err := task.Handler(taskCtx); err != nil {
                slog.Error("Task failed", "id", task.ID, "err", err)
            }
            cancel()

        case <-cw.ctx.Done():
            // Shutdown signal
            return
        }
    }
}
```

**Concurrency guarantees:**

- `taskMu` protects `tasks` map from concurrent access
- `wg` tracks goroutine lifecycle
- `ctx` enables graceful shutdown
- Each task runs in isolated goroutine (non-blocking)

### Synchronization Primitives

**sync.RWMutex (Read-Write Lock):**

```go
cw.taskMu.RLock()    // Multiple readers allowed
defer cw.taskMu.RUnlock()
// Read tasks

cw.taskMu.Lock()     // Exclusive access
defer cw.taskMu.Unlock()
// Modify tasks
```

**sync.WaitGroup:**

```go
cw.wg.Add(1)         // Register goroutine
defer cw.wg.Done()   // Unregister when done

cw.wg.Wait()         // Block until all done
```

**context.Context:**

```go
select {
case <-ticker.C:
    task.Handler()

case <-cw.ctx.Done():
    return  // Shutdown signal
}
```

## Transaction Template Worker Concurrency

```go
type TransactionTemplateWorker struct {
    cronWorker         *common.CronWorker
    templateRepo       repositories.TransactionTemplateRepository
    transactionService services.TransactionService
}

func (ttw *TransactionTemplateWorker) Start() error {
    return ttw.cronWorker.Register(common.CronTask{
        ID:       "process-transaction-templates",
        Name:     "Process Transaction Templates",
        Schedule: 1 * time.Hour,  // Run every hour
        Handler:  ttw.processTemplates,
    })
}

func (ttw *TransactionTemplateWorker) processTemplates(ctx context.Context) error {
    // Get due templates
    dueTemplates, err := ttw.templateRepo.GetDueTemplates(ctx)
    if err != nil {
        slog.Error("Failed to get due templates", "err", err)
        return err
    }

    // Process each template sequentially
    for _, template := range dueTemplates {
        if err := ttw.processTemplate(ctx, template); err != nil {
            // Continue on error (fault-tolerant)
            slog.Error("Failed to process template", "templateID", template.ID, "err", err)
            continue
        }

        // Update tracking
        if err := ttw.templateRepo.UpdateLastExecuted(ctx, template.ID); err != nil {
            slog.Error("Failed to update last_executed", "templateID", template.ID, "err", err)
        }
    }

    return nil
}

func (ttw *TransactionTemplateWorker) processTemplate(ctx context.Context, template models.TransactionTemplateModel) error {
    req := models.CreateTransactionRequestModel{
        Type:      template.Type,
        Amount:    template.Amount,
        AccountID: template.AccountID,
        // ... more fields
    }

    _, err := ttw.transactionService.Create(ctx, req)
    return err
}
```

**Concurrency characteristics:**

- One task runs every 1 hour in dedicated goroutine
- Templates processed sequentially (not parallelized)
- Errors non-fatal: continue processing other templates
- Context passed through all operations
- Database queries share connection pool

## Graceful Shutdown Coordination

```go
// In main.go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)

// Register workers
stopWorkers := internal.RegisterWorker(ctx, pool)

// Wait for signal
<-ctx.Done()

// Shutdown workers
stopWorkers()  // ← Calls ttWorker.Stop() and btWorker.Stop()

// Shutdown HTTP server
shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
srv.Shutdown(shutdownCtx)  // ← Stops accepting, waits for requests
```

**Coordination sequence:**

```
1. OS Signal (SIGTERM)
   ↓
2. context cancelled
   ↓
3. CronWorker.runTask() receives ctx.Done()
   ↓
4. Each goroutine returns
   ↓
5. sync.WaitGroup.Done() called
   ↓
6. CronWorker.Stop() returns
   ↓
7. HTTP server shutdown
```

### Worker Stop Implementation

```go
func (cw *CronWorker) Stop() {
    // Signal all goroutines to stop
    cw.cancel()

    // Wait for all goroutines to exit
    cw.wg.Wait()

    // Clean up resources
    cw.taskMu.Lock()
    for _, st := range cw.tasks {
        st.ticker.Stop()
    }
    cw.taskMu.Unlock()
}
```

**Guarantees:**

- No resource leaks
- All tasks complete or are cancelled
- No panics from half-stopped workers

## Race Condition Prevention

### Map Access

**Wrong (race condition):**

```go
if cw.tasks[taskID] != nil {  // Read
    cw.tasks[taskID] = newTask  // Write
}
```

**Correct:**

```go
cw.taskMu.Lock()
if _, exists := cw.tasks[taskID]; !exists {
    cw.tasks[taskID] = &scheduledTask{...}
}
cw.taskMu.Unlock()
```

### Atomic Operations

**For stopping flag:**

```go
var stopping int32  // Not used currently, but pattern available

atomic.StoreInt32(&stopping, 1)  // Write
if atomic.LoadInt32(&stopping) == 1 {  // Read
    // Worker is stopping
}
```

### Context Cancellation

**Thread-safe cancellation:**

```go
ctx, cancel := context.WithCancel(parent)

// Any goroutine can call cancel()
cancel()

// All select statements receive done signal
select {
case <-ctx.Done():
    return  // All goroutines wake up
}
```

## Connection Pool Concurrency

**pgxpool.Pool safety:**

- Thread-safe by design
- Internal locking handles concurrent requests
- Connection acquisition/release atomic
- Deadlock prevention via timeouts

**Usage:**

```go
// These run concurrently without issues
go func() { pool.Query(ctx, "SELECT ...") }()
go func() { pool.Query(ctx, "SELECT ...") }()
go func() { pool.Query(ctx, "SELECT ...") }()

// Pool handles distribution to available connections
// No manual coordination needed
```

## Performance Characteristics

**HTTP requests:**

- One goroutine per request (minimal overhead)
- Shared database connection pool (efficient)
- Context-based timeouts (prevent hanging)

**Workers:**

- Dedicated goroutine per scheduled task
- Non-blocking execution (doesn't block HTTP)
- Fault-tolerant (errors don't crash worker)

**Shutdown:**

- Graceful: wait for ongoing requests/tasks
- Timeout-based: force close after 10 seconds
- Resource cleanup: no leaks

## Best Practices Applied

1. ✅ **Shared state protected** - RWMutex for task map
2. ✅ **Goroutine lifecycle tracked** - WaitGroup
3. ✅ **Cancellation support** - Context propagation
4. ✅ **No busy-waiting** - Tickers and channels
5. ✅ **Fault isolation** - Worker errors non-fatal
6. ✅ **Resource cleanup** - Defer statements and Stop()
7. ✅ **Timeouts** - Task execution context timeout
8. ✅ **No nested locks** - Single lock per critical section

## Potential Enhancements

1. **Parallelized template processing** - Process multiple templates concurrently
2. **Worker metrics** - Track tasks executed, errors, duration
3. **Health checks** - Verify workers are running
4. **Task priorities** - Some tasks more important than others
5. **Distributed workers** - Multiple instances coordinating via database
6. **Callback system** - Hook into worker lifecycle events
