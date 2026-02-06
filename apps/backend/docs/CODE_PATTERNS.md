# Code Patterns

## RootRepository Aggregate Pattern

All repositories are organized into a single aggregate for centralized initialization and transaction support.

### Structure (`internal/repositories/root_repository.go`)

```go
type DBQuerier interface {
    Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
    QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
    Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type RootRepository struct {
    Pool    *pgxpool.Pool
    db      DBQuerier
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

func NewRootRepository(ctx context.Context, pgx *pgxpool.Pool) RootRepository {
    db := DBQuerier(pgx)
    return RootRepository{
        Pool:    pgx,
        db:      db,
        Acc:     NewAccountRepository(db),
        Ath:     NewAuthRepository(ctx),
        Budg:    NewBudgetRepository(db),
        // ... all other repositories
    }
}

// Transaction support: creates new aggregate with transaction
func (r RootRepository) WithTx(ctx context.Context, tx pgx.Tx) RootRepository {
    return RootRepository{
        Pool:    r.Pool,
        db:      tx,  // All repositories now use transaction
        Acc:     NewAccountRepository(tx),
        Ath:     NewAuthRepository(ctx),
        // ... recreate all repositories with tx
    }
}
```

**Key Benefits:**
- Single initialization point
- Transaction support via `WithTx()` - all repositories use same transaction
- Small `DBQuerier` interface allows testing with mocks
- Individual repositories don't need to know about pool/tx distinction

## Repository Pattern

Individual repositories receive `DBQuerier` interface (not *pgxpool.Pool).

### Structure

```go
type {Resource}Repository struct {
    db DBQuerier  // Can be pool or transaction
}

func New{Resource}Repository(db DBQuerier) {Resource}Repository {
    return {Resource}Repository{db}
}

// Methods follow CRUD + custom queries
func (r {Resource}Repository) List(ctx context.Context, params) (response, error)
func (r {Resource}Repository) Get(ctx context.Context, id int64) (model, error)
func (r {Resource}Repository) Create(ctx context.Context, req) (model, error)
func (r {Resource}Repository) Update(ctx context.Context, id int64, req) (model, error)
func (r {Resource}Repository) Delete(ctx context.Context, id int64) error
```

### Example: TransactionRepository

```go
type TransactionRepository struct {
    pgx *pgxpool.Pool
}

func (tr TransactionRepository) List(ctx context.Context, p models.ListTransactionsRequestModel) (models.ListTransactionsResponseModel, error) {
    // Normalize pagination params
    if p.PageSize <= 0 || p.PageSize > 100 {
        p.PageSize = 10
    }
    if p.PageNumber <= 0 {
        p.PageNumber = 1
    }

    // Map string parameters to SQL
    sortByMap := map[string]string{"id": "t.id", ...}
    sortColumn := sortByMap[p.SortBy]
    sortOrder := sortOrderMap[p.SortOrder]

    // Calculate offset
    offset := (p.PageNumber - 1) * p.PageSize

    // Count total
    err := tr.pgx.QueryRow(ctx, "SELECT COUNT(*) FROM transactions WHERE deleted_at IS NULL").Scan(&totalCount)

    // Query paginated results
    rows, err := tr.pgx.Query(ctx, `
        SELECT t.id, t.type, t.date, t.amount, ...
        FROM transactions t
        WHERE deleted_at IS NULL
        ORDER BY {sortColumn} {sortOrder}
        LIMIT $1 OFFSET $2
    `, p.PageSize, offset)

    // Scan into models
    for rows.Next() {
        var model TransactionModel
        rows.Scan(&model.ID, &model.Type, ...)
        models = append(models, model)
    }

    // Return response
    return ListTransactionsResponseModel{
        Data: models,
        PageNumber: p.PageNumber,
        PageSize: p.PageSize,
        TotalCount: totalCount,
        TotalPages: (totalCount + p.PageSize - 1) / p.PageSize,
    }, nil
}

func (tr TransactionRepository) Create(ctx context.Context, req models.CreateTransactionRequestModel) (models.CreateTransactionResponseModel, error) {
    // Execute INSERT with RETURNING
    err := tr.pgx.QueryRow(ctx, `
        INSERT INTO transactions (type, date, amount, account_id, category_id, note)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at, updated_at
    `, req.Type, req.Date, req.Amount, req.AccountID, req.CategoryID, req.Note).
        Scan(&model.ID, &model.CreatedAt, &model.UpdatedAt)

    return model, err
}

func (tr TransactionRepository) UpdateAccountBalance(ctx context.Context, accountID int64, delta int64) error {
    _, err := tr.pgx.Exec(ctx, `
        UPDATE accounts
        SET amount = amount + $1, updated_at = NOW()
        WHERE id = $2
    `, delta, accountID)
    return err
}
```

## RootService Aggregate Pattern

All services are organized into a single aggregate for centralized initialization with Redis client.

### Structure (`internal/services/root_service.go`)

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

func NewRootService(repos repositories.RootRepository, rdb *redis.Client) RootService {
    return RootService{
        Acc:     NewAccountService(&repos, rdb),
        AccStat: NewAccountStatisticsService(&repos, rdb),
        Ath:     NewAuthService(&repos),  // No cache for auth
        Budg:    NewBudgetService(&repos, rdb),
        // ... all other services
    }
}
```

**Key Benefits:**
- Single initialization point with Redis client injection
- Resources receive entire RootService, access services via fields
- All services have access to all repositories via pointer
- Simplifies cross-service coordination

## Service Pattern

Individual services receive `*RootRepository` and `*redis.Client`.

### Structure

```go
type {Resource}Service struct {
    repo *repositories.RootRepository
    rdb  *redis.Client  // Optional, omit for services without caching
}

func New{Resource}Service(repo *repositories.RootRepository, rdb *redis.Client) {Resource}Service {
    return {Resource}Service{repo, rdb}
}

// Methods delegate to repository and add business logic
func (s {Resource}Service) List(ctx context.Context, params) (response, error) {
    // Use caching pattern (see below)
    return s.repo.{Resource}.List(ctx, params)
}

func (s {Resource}Service) Create(ctx context.Context, req) (response, error) {
    // Business logic + repository call
    result, err := s.repo.{Resource}.Create(ctx, req)
    if err != nil {
        return response{}, err
    }

    // Invalidate caches after mutation
    common.InvalidateCache(ctx, s.rdb, "{resource}:*")

    return result, nil
}
```

### Example: TransactionService

```go
type TransactionService struct {
    tr repositories.TransactionRepository
}

func NewTransactionService(tr repositories.TransactionRepository) TransactionService {
    return TransactionService{tr}
}

func (ts TransactionService) Create(ctx context.Context, p models.CreateTransactionRequestModel) (models.CreateTransactionResponseModel, error) {
    // Create the transaction first
    resp, err := ts.tr.Create(ctx, p)
    if err != nil {
        return models.CreateTransactionResponseModel{}, err
    }

    // Business logic: update account balances based on type
    if p.Type == "transfer" {
        // Transfer: deduct from source, add to destination
        if p.DestinationAccountID != nil {
            if err := ts.tr.UpdateAccountBalance(ctx, p.AccountID, -p.Amount); err != nil {
                return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update source account balance: %w", err)
            }
            if err := ts.tr.UpdateAccountBalance(ctx, *p.DestinationAccountID, p.Amount); err != nil {
                return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update destination account balance: %w", err)
            }
        }
    } else if p.Type == "income" {
        // Income: add to account
        if err := ts.tr.UpdateAccountBalance(ctx, p.AccountID, p.Amount); err != nil {
            return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update account balance: %w", err)
        }
    } else if p.Type == "expense" {
        // Expense: deduct from account
        if err := ts.tr.UpdateAccountBalance(ctx, p.AccountID, -p.Amount); err != nil {
            return models.CreateTransactionResponseModel{}, fmt.Errorf("failed to update account balance: %w", err)
        }
    }

    return resp, nil
}
```

## Caching Pattern

Services use generic caching helper from `internal/common/cache.go`.

### FetchWithCache Pattern

```go
func (s AccountService) List(ctx context.Context, p models.ListAccountsRequestModel) (models.ListAccountsResponseModel, error) {
    // Build cache key from parameters
    cacheKey := common.BuildCacheKey(0, p, "accounts:list")

    // Fetch with caching - cache miss triggers fetcher function
    return common.FetchWithCache(
        ctx,
        s.rdb,
        cacheKey,
        10*time.Minute,  // TTL
        func(ctx context.Context) (models.ListAccountsResponseModel, error) {
            // This only runs on cache miss
            return s.repo.Acc.List(ctx, p)
        },
        "accounts",  // Resource label for Prometheus metrics
    )
}
```

**How FetchWithCache works:**
1. Try `GetCache[T](ctx, rdb, key)` first
2. If found: Increment `cache_hits_total` metric, return cached data
3. If not found: Increment `cache_misses_total` metric
4. Execute fetcher function (repository call)
5. `SetCache()` the result with TTL
6. Return fresh data

### Manual Cache Operations

```go
// Set cache with TTL
err := common.SetCache(ctx, rdb, "accounts:123", accountData, 15*time.Minute)

// Get from cache
data, err := common.GetCache[AccountModel](ctx, rdb, "accounts:123")
if err == redis.Nil {
    // Cache miss
}

// Invalidate by pattern (supports wildcards)
err := common.InvalidateCache(ctx, rdb, "accounts:*")  // Delete all account caches
```

### Cache Key Generation

```go
// BuildCacheKey(id int64, params interface{}, parts ...string) string
cacheKey := common.BuildCacheKey(123, requestParams, "accounts", "statistics")
// Result: "accountsstatistics:123:{json_of_params}"

// For list queries without specific ID
cacheKey := common.BuildCacheKey(0, listParams, "transactions:list")
// Result: "transactions:list:0:{json_of_params}"
```

### Cache Invalidation in Mutations

```go
func (s TransactionService) Create(ctx context.Context, req models.CreateTransactionRequestModel) (models.CreateTransactionResponseModel, error) {
    // 1. Create transaction
    result, err := s.repo.Tsct.Create(ctx, req)
    if err != nil {
        return models.CreateTransactionResponseModel{}, err
    }

    // 2. Update account balances
    // ... business logic ...

    // 3. Invalidate affected caches
    common.InvalidateCache(ctx, s.rdb, "transactions:*")
    common.InvalidateCache(ctx, s.rdb, "accounts:*")
    common.InvalidateCache(ctx, s.rdb, "account_statistics:*")
    common.InvalidateCache(ctx, s.rdb, "summary:*")

    return result, nil
}
```

**Invalidation strategy:**
- Use wildcard patterns to clear all related caches
- Invalidate cross-entity caches (e.g., transaction affects accounts)
- Trade-off: Aggressive invalidation vs. stale data risk

### TTL Guidelines

- **List queries:** 5-15 minutes (frequently changing)
- **Single entities:** 10-30 minutes (moderate stability)
- **Statistics/aggregations:** 5-10 minutes (computationally expensive)
- **Summary data:** 5 minutes (dashboard views)

## Resource Pattern

Resources define HTTP endpoints and receive RootService aggregate (or specific service for simple resources).

### Structure (Typical Pattern)

```go
type {Resource}Resource struct {
    sevs services.RootService  // Receives entire service aggregate
}

func New{Resource}Resource(sevs services.RootService) {Resource}Resource {
    return {Resource}Resource{sevs}
}

func (r {Resource}Resource) Routes(api huma.API) {
    // Define all HTTP operations
    huma.Get(api, "GET /path/{id}", r.Get)
    huma.Get(api, "GET /path", r.List)
    huma.Post(api, "POST /path", r.Post)
    huma.Put(api, "PUT /path/{id}", r.Put)
    huma.Delete(api, "DELETE /path/{id}", r.Delete)
}

// Access specific service via fields
func (r {Resource}Resource) List(ctx context.Context, params *ListRequest) (*ListResponse, error) {
    resp, err := r.sevs.{Resource}.List(ctx, params.Body)
    if err != nil {
        return nil, huma.Error500InternalServerError("Failed", err)
    }
    return &ListResponse{Body: resp}, nil
}
```

### Structure (Simple Resources - Single Service)

For resources that only need one service (e.g., AuthResource):

```go
type AuthResource struct {
    svc services.AuthService  // Receives only needed service
}

func NewAuthResource(svc services.AuthService) AuthResource {
    return AuthResource{svc}
}
```

### Example: AccountResource

```go
type AccountResource struct {
    service AccountService
}

func NewAccountResource(service AccountService) AccountResource {
    return AccountResource{service}
}

func (r AccountResource) Routes(api huma.API) {
    huma.Get(api, "GET /accounts", r.List)
    huma.Get(api, "GET /accounts/{id}", r.Get)
    huma.Post(api, "POST /accounts", r.Create)
    huma.Put(api, "PUT /accounts/{id}", r.Update)
    huma.Delete(api, "DELETE /accounts/{id}", r.Delete)
}

// Huma annotations generate OpenAPI schema from request struct tags
func (r AccountResource) List(ctx context.Context, params *struct {
    PageNumber int `query:"pageNumber" default:"1"`
    PageSize int `query:"pageSize" default:"25"`
    SortBy string `query:"sortBy" default:"createdAt"`
    SortOrder string `query:"sortOrder" default:"desc"`
}) (*struct {
    Body struct {
        Data []AccountModel `json:"data"`
        PageNumber int `json:"pageNumber"`
        TotalCount int `json:"totalCount"`
    }
    Headers struct {
        ContentType string `header:"Content-Type"`
    }
}, error) {
    resp, err := r.service.List(ctx, params)
    if err != nil {
        return nil, huma.Error500InternalServerError("Failed to list accounts", err)
    }
    return &struct {
        Body struct { ... }
        Headers struct { ... }
    }{
        Body: struct {
            Data: resp.Data,
            ...
        },
    }, nil
}

func (r AccountResource) Create(ctx context.Context, req *struct {
    Body models.CreateAccountRequestModel
}) (*struct {
    Body models.CreateAccountResponseModel
    StatusCode int
}, error) {
    resp, err := r.service.Create(ctx, req.Body)
    if err != nil {
        return nil, huma.Error400BadRequest("Failed to create account", err)
    }
    return &struct {
        Body models.CreateAccountResponseModel
        StatusCode int
    }{
        Body: resp,
        StatusCode: http.StatusCreated,
    }, nil
}
```

## Model Pattern

Models use struct tags for:

- JSON serialization (`json:"fieldName"`)
- OpenAPI schema generation (`doc:"description"`, `minimum:"1"`, `enum:"val1,val2"`)
- Request validation (`required:"true"`, `minLength:"1"`)

### Example: AccountModel

```go
type ListAccountsRequestModel struct {
    PageNumber int      `query:"pageNumber" default:"1" minimum:"1" doc:"Page number"`
    PageSize   int      `query:"pageSize" default:"25" minimum:"1" maximum:"100" doc:"Items per page"`
    SortBy     string   `query:"sortBy" default:"createdAt" enum:"name,type,amount,createdAt" doc:"Sort field"`
    SortOrder  string   `query:"sortOrder" default:"desc" enum:"asc,desc" doc:"Sort order"`
}

type AccountModel struct {
    ID          int64      `json:"id" doc:"Unique identifier"`
    Name        string     `json:"name" minLength:"1" doc:"Account name"`
    Type        string     `json:"type" enum:"expense,income" doc:"Account type"`
    Amount      int64      `json:"amount" doc:"Current balance"`
    ArchivedAt  *time.Time `json:"archivedAt,omitempty" doc:"Archive timestamp"`
    CreatedAt   time.Time  `json:"createdAt" doc:"Creation timestamp"`
    UpdatedAt   *time.Time `json:"updatedAt,omitempty" doc:"Update timestamp"`
    DeletedAt   *time.Time `json:"deletedAt,omitempty" doc:"Soft delete timestamp"`
}

type CreateAccountRequestModel struct {
    Name   string `json:"name" minLength:"1" required:"true" doc:"Account name"`
    Type   string `json:"type" enum:"expense,income" required:"true" doc:"Account type"`
    Amount int64  `json:"amount" doc:"Initial balance"`
}

type CreateAccountResponseModel struct {
    AccountModel  // Embed base model
}
```

## Error Handling Pattern

### Repository Layer

```go
func (r Repository) Method(ctx context.Context) (Model, error) {
    err := r.pgx.QueryRow(ctx, "SELECT ...").Scan(&model)
    if err != nil {
        if err == pgx.ErrNoRows {
            return Model{}, fmt.Errorf("record not found: %w", err)
        }
        return Model{}, fmt.Errorf("database error: %w", err)
    }
    return model, nil
}
```

### Service Layer

```go
func (s Service) Method(ctx context.Context, req Request) (Response, error) {
    model, err := s.repo.Method(ctx)
    if err != nil {
        return Response{}, fmt.Errorf("failed to fetch model: %w", err)
    }
    // business logic
    return resp, nil
}
```

### Resource Layer

```go
func (r Resource) Handler(ctx context.Context, req *Request) (*Response, error) {
    resp, err := r.service.Method(ctx)
    if err != nil {
        // Transform to HTTP error
        if strings.Contains(err.Error(), "not found") {
            return nil, huma.Error404NotFound("Record not found", err)
        }
        return nil, huma.Error500InternalServerError("Server error", err)
    }
    return &resp, nil
}
```

## Soft Delete Pattern

All tables have `deleted_at TIMESTAMP` column. Records are "deleted" by setting this to NOW().

### Delete Operation

```go
func (r Repository) Delete(ctx context.Context, id int64) error {
    _, err := r.pgx.Exec(ctx, `
        UPDATE table_name
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1
    `, id)
    return err
}
```

### List/Get Operations

**Always filter out soft-deleted records:**

```go
func (r Repository) List(ctx context.Context) ([]Model, error) {
    rows, err := r.pgx.Query(ctx, `
        SELECT id, name, ...
        FROM table_name
        WHERE deleted_at IS NULL  -- Always include this
        ORDER BY created_at DESC
    `)
    // scan into models
}

func (r Repository) Get(ctx context.Context, id int64) (Model, error) {
    err := r.pgx.QueryRow(ctx, `
        SELECT id, name, ...
        FROM table_name
        WHERE id = $1 AND deleted_at IS NULL  -- Always include this
    `, id).Scan(&model.ID, &model.Name, ...)
}
```

## Template Query Pattern (Workers)

Template repositories implement custom query logic for worker processing.

### GetDueTemplates Pattern

```go
func (r TransactionTemplateRepository) GetDueTemplates(ctx context.Context) ([]TransactionTemplateModel, error) {
    // Query templates that are:
    // 1. Not deleted
    // 2. Set to recur (recurrence != 'none')
    // 3. Within date range (start <= today <= end)
    // 4. Due for processing (last_executed_at elapsed based on interval)

    rows, err := r.pgx.Query(ctx, `
        SELECT id, name, type, amount, account_id, category_id, recurrence, start_date, end_date, last_executed_at, created_at
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

    // Scan into models slice
}

func (r TransactionTemplateRepository) UpdateLastExecuted(ctx context.Context, id int64) error {
    _, err := r.pgx.Exec(ctx, `
        UPDATE transaction_templates
        SET last_executed_at = NOW(), updated_at = NOW()
        WHERE id = $1
    `, id)
    return err
}
```

### BudgetPeriod Calculation Pattern

```go
func (w *BudgetTemplateWorker) calculateBudgetPeriod(recurrence string) (time.Time, time.Time) {
    now := time.Now()

    switch recurrence {
    case "weekly":
        // Monday to Sunday of current week
        weekday := now.Weekday()
        daysToMonday := int(time.Monday) - int(weekday)
        if daysToMonday > 0 {
            daysToMonday -= 7
        }
        monday := now.AddDate(0, 0, daysToMonday)
        sunday := monday.AddDate(0, 0, 6)
        return monday, sunday

    case "monthly":
        // 1st to last day of current month
        first := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
        last := first.AddDate(0, 1, -1)
        return first, last

    case "yearly":
        // Jan 1 to Dec 31 of current year
        first := time.Date(now.Year(), time.January, 1, 0, 0, 0, 0, now.Location())
        last := time.Date(now.Year(), time.December, 31, 23, 59, 59, 0, now.Location())
        return first, last
    }

    return now, now
}
```

## One-to-Many Deduplication Pattern

When a LEFT JOIN creates multiple rows per entity (e.g., one account with multiple budgets), use PostgreSQL window functions to deduplicate and select only one related record.

### Problem

Without deduplication, LEFT JOIN produces duplicate rows:

```sql
-- ❌ WRONG: Creates duplicate accounts when multiple budgets exist
SELECT a.*, b.*
FROM accounts a
LEFT JOIN budgets b ON b.account_id = a.id
    AND b.status = 'active'
WHERE a.deleted_at IS NULL
LIMIT 10 OFFSET 0
```

If account ID 1 has 2 active budgets:
- Row 1: Account 1 + Budget ID 5
- Row 2: Account 1 + Budget ID 1  ← Duplicate account!

This causes:
- Duplicate accounts in paginated responses
- Wrong `LIMIT/OFFSET` boundaries (applied to joined rows, not unique accounts)
- Inflated `COUNT(*) OVER()` totals

### Solution: Window Function with ROW_NUMBER()

Use `ROW_NUMBER() OVER (PARTITION BY ...)` to rank related records and select only one:

```sql
-- ✅ CORRECT: Window function deduplicates by ranking budgets per account
WITH ranked_budgets AS (
    SELECT
        b.*,
        COALESCE((SELECT SUM(t.amount) FROM transactions t
                  WHERE t.account_id = b.account_id
                  AND t.date >= b.period_start
                  AND t.date <= b.period_end
                  AND t.deleted_at IS NULL), 0) as actual_amount,
        ROW_NUMBER() OVER (PARTITION BY b.account_id ORDER BY b.id DESC) as rn
    FROM budgets b
    WHERE b.status = 'active'
        AND b.period_start <= CURRENT_DATE
        AND b.period_end >= CURRENT_DATE
        AND b.deleted_at IS NULL
),
filtered_accounts AS (
    SELECT
        a.id, a.name, a.type, /* ... all account fields ... */
        b.id as budget_id, b.template_id, /* ... all budget fields ... */
        b.actual_amount,
        COUNT(*) OVER() as total_count  -- Now counts unique accounts
    FROM accounts a
    LEFT JOIN ranked_budgets b ON b.account_id = a.id AND b.rn = 1  -- ← Only first ranked budget
    WHERE a.deleted_at IS NULL
        -- ... filters ...
    ORDER BY a.created_at DESC
    LIMIT $1 OFFSET $2
)
SELECT * FROM filtered_accounts
ORDER BY created_at DESC
```

**Key Points:**
- `PARTITION BY b.account_id` - Groups budgets by account
- `ORDER BY b.id DESC` - Ranks budgets (newest first)
- `rn = 1` in JOIN - Selects only the top-ranked budget per account
- `COUNT(*) OVER()` - Counts unique accounts after deduplication
- `LIMIT/OFFSET` - Applied to unique accounts, not joined rows

### Alternative: LATERAL Subquery for Detail Endpoints

For single-record queries (`GetDetail`), use `LATERAL` subquery with `LIMIT 1`:

```sql
-- ✅ For detail endpoint: LATERAL ensures only one budget returned
SELECT
    a.id, a.name, /* ... account fields ... */
    b.budget_id, b.template_id, /* ... budget fields ... */
    b.actual_amount
FROM accounts a
LEFT JOIN LATERAL (
    SELECT
        b.id as budget_id,
        b.template_id,
        b.account_id,
        b.category_id,
        b.period_start,
        b.period_end,
        b.amount_limit,
        COALESCE((SELECT SUM(t.amount) FROM transactions t
                  WHERE t.account_id = a.id
                  AND t.date >= b.period_start
                  AND t.date <= b.period_end
                  AND t.deleted_at IS NULL), 0) as actual_amount,
        b.period_type,
        b.name as budget_name
    FROM budgets b
    WHERE b.account_id = a.id
        AND b.status = 'active'
        AND b.period_start <= CURRENT_DATE
        AND b.period_end >= CURRENT_DATE
        AND b.deleted_at IS NULL
    ORDER BY b.id DESC
    LIMIT 1  -- ← Only one budget
) b ON true
WHERE a.id = $1 AND a.deleted_at IS NULL
```

### When to Use This Pattern

Apply this pattern when:
- One-to-many relationships (1 account → N budgets, 1 category → N budgets)
- Multiple active records can exist simultaneously (e.g., NULL values bypass unique constraints)
- JOIN might produce duplicate parent records
- Pagination and counting must be accurate

### Real-World Example: Multiple Active Budgets

PostgreSQL allows multiple active budgets per account when `category_id = NULL`:

```sql
-- accounts table
id | name
1  | Dompet Utama

-- budgets table (both active for account 1)
id | account_id | category_id | period_start | period_end | status
1  | 1          | NULL        | 2026-01-01   | 2026-01-31 | active
5  | 1          | NULL        | 2026-02-01   | 2026-02-28 | active
```

**Without deduplication:**
- `GET /accounts?pageSize=10` returns Account 1 twice
- `totalCount = 2` (wrong - should be 1)
- Pagination breaks (LIMIT applied to 2 rows, not 1 account)

**With window function:**
- Account 1 appears once with budget ID 5 (highest ID)
- `totalCount = 1` (correct)
- Pagination works correctly

### Testing Deduplication

Create E2E test to verify:

```typescript
// Create account with 2 active budget templates
const account = await createAccount({ name: "Test" });
await createBudgetTemplate({ accountId: account.id, /* ... */ });
await createBudgetTemplate({ accountId: account.id, /* ... */ });

// Verify account appears only once
const accounts = await getAccounts({ pageSize: 100 });
const occurrences = accounts.items.filter(a => a.id === account.id);
expect(occurrences.length).toBe(1);  // Not 2!

// Verify embedded budget is the most recent
expect(occurrences[0].embeddedBudget.id).toBe(maxBudgetId);
```
