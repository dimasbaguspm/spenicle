# Workers

Background workers execute scheduled and asynchronous tasks without blocking HTTP request handling.

## Worker System Overview

**Architecture:**

- **CronWorker** - Manages scheduled recurring tasks (located in `internal/common/`)
- **QueueWorker** - Manages async job queue (reserved for future use)
- **Business Logic Workers** - Implement specific recurring operations (located in `internal/workers/`)

**Current workers:**

- TransactionTemplateWorker - Creates recurring transactions
- BudgetTemplateWorker - Creates recurring budgets

## CronWorker (Scheduler)

**File:** `internal/common/cron_worker.go`

Core infrastructure for scheduling recurring tasks.

### Structure

```go
type CronWorker struct {
    ctx      context.Context      // Shared context for cancellation
    cancel   context.CancelFunc   // Cancel function
    tasks    map[string]*scheduledTask  // Registered tasks
    taskMu   sync.RWMutex         // Protects tasks map
    wg       sync.WaitGroup       // Tracks goroutine lifecycle
    stopping int32                // Atomic stopping flag (reserved)
}

type CronTask struct {
    ID       string              // Unique identifier
    Name     string              // Human-readable name
    Schedule time.Duration       // Execution interval
    Handler  CronHandler         // Function to execute
}

type CronHandler func(ctx context.Context) error
```

### Creating a CronWorker

```go
ctx := context.Background()
cw := common.NewCronWorker(ctx)

// Register multiple tasks
cw.Register(CronTask{
    ID:       "task-1",
    Name:     "Task One",
    Schedule: 1 * time.Hour,
    Handler:  func(ctx context.Context) error { /* ... */ },
})

cw.Register(CronTask{
    ID:       "task-2",
    Name:     "Task Two",
    Schedule: 24 * time.Hour,
    Handler:  func(ctx context.Context) error { /* ... */ },
})

// Later: stop all tasks
cw.Stop()  // Gracefully shuts down all task goroutines
```

### Task Registration

```go
func (cw *CronWorker) Register(task CronTask) error {
    // Validate inputs
    if task.Handler == nil {
        return fmt.Errorf("handler cannot be nil for task %s", task.ID)
    }
    if task.Schedule <= 0 {
        return fmt.Errorf("schedule duration must be positive for task %s", task.ID)
    }

    // Lock for safe map modification
    cw.taskMu.Lock()
    defer cw.taskMu.Unlock()

    // Check if already registered
    if _, exists := cw.tasks[task.ID]; exists {
        return fmt.Errorf("task %s already registered", task.ID)
    }

    // Create ticker for this task
    ticker := time.NewTicker(task.Schedule)
    cw.tasks[task.ID] = &scheduledTask{
        task:   task,
        ticker: ticker,
    }

    // Spawn independent goroutine for execution
    cw.wg.Add(1)
    go cw.runTask(task, ticker)

    return nil
}
```

**Key points:**

- Returns error if task ID already exists
- Returns error if handler is nil or schedule <= 0
- Each task gets independent goroutine with ticker
- WaitGroup tracks spawned goroutines

### Task Execution Loop

```go
func (cw *CronWorker) runTask(task CronTask, ticker *time.Ticker) {
    defer cw.wg.Done()
    defer ticker.Stop()

    // Task runs until shutdown signal
    for {
        select {
        case <-ticker.C:
            // Time to execute task
            // Immediate execution on schedule
            if err := task.Handler(cw.ctx); err != nil {
                slog.Error(
                    "Task handler failed",
                    "taskID", task.ID,
                    "taskName", task.Name,
                    "err", err,
                )
            }

        case <-cw.ctx.Done():
            // Shutdown signal received
            slog.Info("Shutting down task", "taskID", task.ID)
            return
        }
    }
}
```

**Behavior:**

- Ticker fires every `schedule` duration
- Handler runs synchronously
- Errors logged but don't crash worker
- Graceful shutdown via context cancellation

**Timing:** If handler takes 2 minutes and schedule is 1 hour, next execution is ~1 hour after first completes (not 1 hour from completion).

### Worker Cleanup

```go
func (cw *CronWorker) Stop() {
    // Cancel all task goroutines
    cw.cancel()

    // Wait for all to exit
    cw.wg.Wait()

    // Stop all tickers
    cw.taskMu.Lock()
    for _, st := range cw.tasks {
        st.ticker.Stop()
    }
    cw.taskMu.Unlock()
}
```

**Sequence:**

1. Context cancelled
2. All runTask() goroutines wake up on ctx.Done()
3. Goroutines return (cw.wg.Done() called)
4. cw.wg.Wait() unblocks
5. Tickers stopped
6. Stop() returns

---

## TransactionTemplateWorker

**File:** `internal/workers/transaction_template_worker.go`

Creates recurring transactions from templates on a schedule.

### Purpose

Automates recurring transaction creation:

- Subscription payments (monthly)
- Regular bills (weekly, monthly)
- Recurring income (daily salary bonuses)
- Installment tracking

### Structure

```go
type TransactionTemplateWorker struct {
    cronWorker         *common.CronWorker                      // Scheduler
    templateRepo       repositories.TransactionTemplateRepository  // Templates DB access
    transactionService services.TransactionService             // Transaction creation
}

func NewTransactionTemplateWorker(
    ctx context.Context,
    templateRepo repositories.TransactionTemplateRepository,
    transactionService services.TransactionService,
) *TransactionTemplateWorker {
    return &TransactionTemplateWorker{
        cronWorker:         common.NewCronWorker(ctx),
        templateRepo:       templateRepo,
        transactionService: transactionService,
    }
}
```

### Starting the Worker

```go
func (ttw *TransactionTemplateWorker) Start() error {
    slog.Info("Starting transaction template worker")

    return ttw.cronWorker.Register(common.CronTask{
        ID:       "process-transaction-templates",
        Name:     "Process Transaction Templates",
        Schedule: 1 * time.Hour,  // Every hour
        Handler:  ttw.processTemplates,
    })
}
```

**Schedule:** Every 1 hour

**Handler:** `ttw.processTemplates` method

### Processing Templates

```go
func (ttw *TransactionTemplateWorker) processTemplates(ctx context.Context) error {
    slog.Debug("Processing transaction templates")

    // 1. Get all templates due for processing
    dueTemplates, err := ttw.templateRepo.GetDueTemplates(ctx)
    if err != nil {
        slog.Error("Failed to get due templates", "err", err)
        return err
    }

    // 2. Exit early if none due
    if len(dueTemplates) == 0 {
        slog.Debug("No templates due for processing")
        return nil
    }

    // 3. Log how many templates to process
    slog.Info("Processing templates", "count", len(dueTemplates))

    // 4. Process each template
    for _, template := range dueTemplates {
        // Process template
        if err := ttw.processTemplate(ctx, template); err != nil {
            // Log error but continue (fault-tolerant)
            slog.Error(
                "Failed to process template",
                "templateID", template.ID,
                "templateName", template.Name,
                "err", err,
            )
            continue  // Next template
        }

        // Update tracking timestamp
        if err := ttw.templateRepo.UpdateLastExecuted(ctx, template.ID); err != nil {
            slog.Error(
                "Failed to update template execution time",
                "templateID", template.ID,
                "err", err,
            )
        }
    }

    return nil  // Returns success even if individual templates failed
}
```

**Key characteristics:**

- Gets list of due templates from database
- Iterates and processes each
- Continues on error (doesn't stop if one fails)
- Updates last_executed_at tracking

### Processing Individual Template

```go
func (ttw *TransactionTemplateWorker) processTemplate(ctx context.Context, template models.TransactionTemplateModel) error {
    // Build transaction request from template
    req := models.CreateTransactionRequestModel{
        Type:                template.Type,          // 'expense', 'income', 'transfer'
        Amount:              template.Amount,
        AccountID:           template.AccountID,
        CategoryID:          template.CategoryID,
        DestinationAccountID: template.DestinationAccountID,
        Note:                template.Note,
        Date:                time.Now(),             // Use today's date
    }

    // Create transaction (updates account balances)
    _, err := ttw.transactionService.Create(ctx, req)
    return err
}
```

**Workflow:**

1. Copy relevant template fields to request
2. Set date to today
3. Call TransactionService.Create()
   - Creates transaction record
   - Updates account balances based on type
4. Return any errors

### Stopping the Worker

```go
func (ttw *TransactionTemplateWorker) Stop() {
    ttw.cronWorker.Stop()
}
```

Delegates to underlying CronWorker.

---

## BudgetTemplateWorker

**File:** `internal/workers/budget_template_worker.go`

Creates recurring budgets from templates on a daily schedule.

### Purpose

Automates recurring budget creation:

- Weekly budgets (Monday-Sunday)
- Monthly budgets (1st-last day)
- Yearly budgets (Jan-Dec)
- Automatic period calculation

### Structure

```go
type BudgetTemplateWorker struct {
    cronWorker           *common.CronWorker                    // Scheduler
    budgetTemplateRepo   repositories.BudgetTemplateRepository  // Templates DB access
    budgetService        services.BudgetService                // Budget creation
}
```

### Starting the Worker

```go
func (btw *BudgetTemplateWorker) Start() error {
    slog.Info("Starting budget template worker")

    return btw.cronWorker.Register(common.CronTask{
        ID:       "process-budget-templates",
        Name:     "Process Budget Templates",
        Schedule: 24 * time.Hour,  // Every 24 hours
        Handler:  btw.processTemplates,
    })
}
```

**Schedule:** Every 24 hours

**Handler:** `btw.processTemplates` method

### Processing Templates

Same pattern as TransactionTemplateWorker:

```go
func (btw *BudgetTemplateWorker) processTemplates(ctx context.Context) error {
    // 1. Get due templates
    dueTemplates, err := btw.budgetTemplateRepo.GetDueTemplates(ctx)
    if err != nil {
        slog.Error("Failed to get due templates", "err", err)
        return err
    }

    // 2. Early exit if none
    if len(dueTemplates) == 0 {
        slog.Debug("No templates due for processing")
        return nil
    }

    // 3. Process each
    for _, template := range dueTemplates {
        if err := btw.processTemplate(ctx, template); err != nil {
            slog.Error("Failed to process template", "templateID", template.ID, "err", err)
            continue
        }

        // 4. Update tracking
        if err := btw.budgetTemplateRepo.UpdateLastExecuted(ctx, template.ID); err != nil {
            slog.Error("Failed to update last_executed", "templateID", template.ID, "err", err)
        }
    }

    return nil
}
```

### Processing Individual Template with Period Calculation

```go
func (btw *BudgetTemplateWorker) processTemplate(ctx context.Context, template models.BudgetTemplateModel) error {
    // Calculate period dates based on recurrence
    periodStart, periodEnd := btw.calculateBudgetPeriod(template.Recurrence)

    // Build budget request
    req := models.CreateBudgetRequestModel{
        TemplateID:   &template.ID,      // Link to template
        AmountLimit:  template.AmountLimit,
        PeriodStart:  periodStart,
        PeriodEnd:    periodEnd,
    }

    // Create budget
    _, err := btw.budgetService.Create(ctx, req)
    return err
}
```

### Period Calculation

```go
func (btw *BudgetTemplateWorker) calculateBudgetPeriod(recurrence string) (time.Time, time.Time) {
    now := time.Now()

    switch recurrence {
    case "weekly":
        // Current week Monday-Sunday
        weekday := now.Weekday()
        daysToMonday := int(time.Monday) - int(weekday)
        if daysToMonday > 0 {
            daysToMonday -= 7
        }
        monday := now.AddDate(0, 0, daysToMonday)
        sunday := monday.AddDate(0, 0, 6)
        return monday, sunday

    case "monthly":
        // Current month 1st-last day
        first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
        last := first.AddDate(0, 1, -1)  // First day of next month - 1 day
        return first, last

    case "yearly":
        // Current calendar year Jan-Dec
        first := time.Date(now.Year(), time.January, 1, 0, 0, 0, 0, now.Location())
        last := time.Date(now.Year(), time.December, 31, 23, 59, 59, 0, now.Location())
        return first, last
    }

    return now, now
}
```

**Examples:**

Today: 2024-01-15 (Wednesday)

- **Weekly:** 2024-01-08 (Monday) to 2024-01-14 (Sunday)
  - Wait, today is Jan 15, so: 2024-01-15 (Monday) to 2024-01-21 (Sunday)
- **Monthly:** 2024-01-01 to 2024-01-31

- **Yearly:** 2024-01-01 to 2024-12-31

---

## Worker Integration

### Registration in handlers.go

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

    // 3. Initialize workers
    ttWorker := workers.NewTransactionTemplateWorker(ctx, ttr, ts)
    if err := ttWorker.Start(); err != nil {
        slog.Error("Failed to start transaction template worker", "err", err)
    }

    btWorker := workers.NewBudgetTemplateWorker(ctx, btr, budgetService)
    if err := btWorker.Start(); err != nil {
        slog.Error("Failed to start budget template worker", "err", err)
    }

    // 4. Return cleanup function
    return func() {
        slog.Info("Stopping all workers")
        ttWorker.Stop()
        btWorker.Stop()
    }
}
```

**Called from:** `internal.RegisterWorker(ctx, pool)` in main.go

### Startup in main.go

```go
stopWorkers := internal.RegisterWorker(ctx, pool)
```

Initializes both workers, returns cleanup function.

### Shutdown in main.go

```go
<-ctx.Done()
stopWorkers()  // Gracefully stop all workers
```

Calls cleanup function during graceful shutdown.

---

## Template Query Logic (GetDueTemplates)

### TransactionTemplate.GetDueTemplates()

```go
func (r *TransactionTemplateRepository) GetDueTemplates(ctx context.Context) ([]TransactionTemplateModel, error) {
    rows, err := r.pgx.Query(ctx, `
        SELECT id, name, type, amount, account_id, category_id, destination_account_id, note,
               recurrence, start_date, end_date, last_executed_at, created_at
        FROM transaction_templates
        WHERE deleted_at IS NULL
        AND recurrence != 'none'
        AND start_date <= CURRENT_DATE
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        AND (
            last_executed_at IS NULL
            OR (recurrence = 'daily' AND last_executed_at < CURRENT_TIMESTAMP - INTERVAL '24 hours')
            OR (recurrence = 'weekly' AND last_executed_at < CURRENT_TIMESTAMP - INTERVAL '7 days')
            OR (recurrence = 'monthly' AND last_executed_at < CURRENT_TIMESTAMP - INTERVAL '1 month')
            OR (recurrence = 'yearly' AND last_executed_at < CURRENT_TIMESTAMP - INTERVAL '1 year')
        )
        ORDER BY created_at ASC
    `)

    // Scan into models
    var templates []TransactionTemplateModel
    for rows.Next() {
        var t TransactionTemplateModel
        rows.Scan(&t.ID, &t.Name, ...)
        templates = append(templates, t)
    }

    return templates, nil
}
```

**Query logic:**

- Not deleted
- Has recurrence set (not 'none')
- Within date range
- Due based on interval:
  - daily: > 24 hours since last
  - weekly: > 7 days since last
  - monthly: > 1 month since last
  - yearly: > 1 year since last

### BudgetTemplate.GetDueTemplates()

Same logic but no 'daily' option (budgets are typically weekly/monthly/yearly).

---

## Error Handling in Workers

Workers are fault-tolerant:

```go
for _, template := range dueTemplates {
    if err := ttw.processTemplate(ctx, template); err != nil {
        // Log error
        slog.Error("Failed to process template", "templateID", template.ID, "err", err)
        // Continue to next template (don't crash)
        continue
    }

    // Only update if successful
    if err := ttw.templateRepo.UpdateLastExecuted(ctx, template.ID); err != nil {
        slog.Error("Failed to update last_executed", "templateID", template.ID, "err", err)
        // Don't return; continue to next template
    }
}

return nil  // Always returns nil (success) to keep worker running
```

**Benefits:**

- One template failure doesn't affect others
- Worker continues running
- Errors logged for monitoring
- Retry on next cycle

---

## Monitoring and Debugging

### Worker Health

Add these log messages to monitor:

- "Starting {worker} worker" - Startup
- "Processing templates" - Beginning iteration
- "Processing N templates" - Count due
- "No templates due" - Nothing to do
- "Failed to process template" - Individual failure
- "Failed to update last_executed" - Tracking failure
- "Stopping all workers" - Shutdown

### Performance Optimization

**Current implementation:**

- Templates processed sequentially
- No parallelization

**Potential improvements:**

- Process multiple templates concurrently (with pooling)
- Batch database updates
- Add metrics/monitoring
- Implement worker-specific health checks

---

## QueueWorker (Reserved)

Located in `internal/common/queue_worker.go`

Currently reserved for future use. Implementation available but not used.

**Intended use cases:**

- Long-running batch operations
- Image processing
- Report generation
- Email sending

**Pattern:**

```go
qw := common.NewQueueWorker(ctx, 10)  // Max 10 concurrent workers
qw.RegisterHandler("send-email", sendEmailHandler)
qw.Enqueue("send-email", data)  // Non-blocking
qw.Stop()  // Drain and shutdown
```
