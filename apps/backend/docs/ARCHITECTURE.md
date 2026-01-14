# Backend Architecture

## Overview

The Spenicle backend is a Go REST API built with clean layered architecture. It follows the **Repository → Service → Resource** pattern with centralized dependency injection and background worker infrastructure.

**Technology Stack:**

- **Framework:** Huma v2 (REST API framework)
- **Database:** PostgreSQL with pgxpool connection pooling
- **HTTP Server:** Go net/http with graceful shutdown
- **Concurrency:** Goroutines with sync.WaitGroup and context cancellation
- **Migrations:** SQL-based versioning system

## Layered Architecture

```
HTTP Request
    ↓
Middleware (CORS, Auth/Session)
    ↓
Resource Layer (routes.go, handlers)
    ↓
Service Layer (business logic)
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
- Example: `AccountResource.Routes()` registers GET/POST/PUT/DELETE /accounts

**Service Layer** (`internal/services/`)

- Business logic and validation
- Cross-entity coordination (e.g., updating account balance during transaction creation)
- Error handling and transformation
- Example: `TransactionService.Create()` handles:
  1. Transaction creation via repository
  2. Account balance updates based on transaction type
  3. Return formatted response

**Repository Layer** (`internal/repositories/`)

- Data access and SQL queries
- Result mapping to models
- Transaction coordination with database
- Example: `TransactionRepository.Create()` executes SQL INSERT and returns model

**Model Layer** (`internal/models/`)

- Request/Response DTOs (struct definitions with tags)
- Database model representations
- OpenAPI schema integration via struct tags

## Dependency Injection Pattern

Dependencies are injected at startup in `handlers.go`:

1. **Public Routes** (unauthenticated):

   ```go
   ap := repositories.NewAuthRepository(ctx)
   as := services.NewAuthService(ap)
   resources.NewAuthResource(as).Routes(huma)
   ```

2. **Private Routes** (authenticated via SessionMiddleware):

   ```go
   accountRepo := repositories.NewAccountRepository(pool)
   accountService := services.NewAccountService(accountRepo)
   resources.NewAccountResource(accountService).Routes(huma)
   ```

3. **Workers**:
   ```go
   ttWorker := workers.NewTransactionTemplateWorker(ctx, templateRepo, transactionService)
   ttWorker.Start()
   ```

## Middleware Stack

Middleware is applied in order:

1. **CORS Middleware** - Applied globally (all routes)

   - Validates Origin header against allowlist
   - Sets Access-Control headers
   - Runs before route matching

2. **Session Middleware** - Applied to private routes only
   - Extracts Bearer token from Authorization header
   - Validates token signature and expiration
   - Rejects request if invalid/missing (HTTP 401)

## Request Flow Example: Create Transaction

```
1. POST /transactions {type, amount, accountID}
   ↓
2. CORS Middleware validates origin
   ↓
3. SessionMiddleware extracts and validates Bearer token
   ↓
4. TransactionResource.Post() receives request
   ↓
5. TransactionService.Create(ctx, request) processes:
   - Creates transaction record
   - Updates source account balance
   - Updates destination account balance (if transfer)
   - Updates transaction-tag relationships
   ↓
6. TransactionRepository.Create(ctx, request) executes:
   - SQL INSERT into transactions table
   - Returns created transaction model
   ↓
7. Resource returns CreateTransactionResponseModel (HTTP 200)
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

## Graceful Shutdown

Shutdown sequence (main.go):

```
1. OS signal received (Interrupt/SIGTERM)
2. context cancelled via signal.NotifyContext
3. RegisterWorker() cleanup function called:
   - TransactionTemplateWorker.Stop() cancels context, waits for goroutines
   - BudgetTemplateWorker.Stop() cancels context, waits for goroutines
4. HTTP server.Shutdown(ctx) with 10s timeout
5. Application exits
```

## Error Handling

- Repository errors wrapped with context using `fmt.Errorf("%w", err)`
- Service layer transforms to HTTP-appropriate errors
- Resource layer uses Huma error helpers: `huma.Error400BadRequest()`, `huma.Error404NotFound()`, etc.
- Worker errors logged via slog but don't crash worker (fault-tolerant)
