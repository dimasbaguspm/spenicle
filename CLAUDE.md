# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Spenicle is a personal finance management application with budget tracking, transaction management, and comprehensive reporting features. This is a **monorepo** containing multiple applications:

- **apps/backend/** - Go REST API (Huma v2 framework)
- **apps/backend-bdd/** - Backend E2E tests (Playwright + TypeScript)
- **apps/frontend-web/** - Web frontend (React 19 + TypeScript + Vite)
- **apps/frontend-tui/** - Terminal UI (future development)
- **apps/dotlab/** - Additional tooling/experiments

**Tech Stack:**
- Backend: Go 1.25+, PostgreSQL 15+, Redis 8.4+, Huma v2
- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, TanStack Query
- Tests: Playwright (API testing), Go testing stdlib
- Package Manager: Bun (preferred for frontend/tests)

## Essential Commands

### Backend (Go API)

```bash
cd apps/backend

# Development
go run cmd/app/main.go              # Run server (requires DB)
docker compose up -d                 # Start PostgreSQL + Redis
gofmt -w .                          # Format code
go test ./... -v                    # Run all tests
go build ./...                      # Build

# Migrations
# Migrations run automatically on startup
# Manual rollback: psql -U postgres -d spenicle < migrations/{file}.down.sql
```

### Backend E2E Tests

```bash
cd apps/backend-bdd

# Setup & Testing
bun install                         # Install dependencies
sudo docker compose up -d           # Start isolated test environment (port 8081)
bun run test                        # Run all E2E tests
bun run test:ui                     # Run with Playwright UI
bun run generate:types              # Regenerate OpenAPI types
sudo docker compose down -v         # Stop and clean environment
```

**Important:** Backend E2E tests use an isolated Docker environment (port 8081, PostgreSQL on 5433) separate from development.

### Frontend Web

```bash
cd apps/frontend-web

# Development
bun install                         # Install dependencies
bun run dev                         # Start Vite dev server
bun run build                       # Build for production
bun run generate:types              # Generate API types from OpenAPI spec
bun run check                       # TypeScript type check
```

## Architecture & Code Organization

### Backend Architecture

**Layered Architecture with Caching: Resource → Service → Cache → Repository**

```
HTTP Request
    ↓
4-Layer Middleware Stack
    ├─ ObservabilityMiddleware (request ID, logging, Prometheus metrics)
    ├─ RateLimitMiddleware (Redis, 100 req/min, production only)
    ├─ CORS (origin validation)
    └─ SessionMiddleware (JWT auth, private routes only)
    ↓
Resource Layer (internal/resources/)     - HTTP handlers, Huma decorators
    ↓
Service Layer (internal/services/)       - Business logic, cache invalidation
    ↓
Cache Layer (Redis)                      - TTL-based caching with metrics
    ├─ Cache Hit → Return cached data
    └─ Cache Miss → Fetch from Repository
    ↓
Repository Layer (internal/repositories/) - Data access, SQL queries
    ↓
PostgreSQL
```

**Key Directories:**
- `cmd/app/` - Application bootstrap and wiring (main.go)
- `internal/handlers.go` - Route registration with Root* aggregates
- `internal/resources/` - HTTP endpoints (Huma handlers)
- `internal/services/` - Business logic + cache invalidation
- `internal/repositories/` - Database access (RootRepository aggregate)
- `internal/models/` - Request/response DTOs with Huma validation tags
- `internal/middleware/` - 4 middlewares (observability, rate limit, CORS, session)
- `internal/common/cache.go` - Generic caching utilities (FetchWithCache, InvalidateCache)
- `internal/observability/` - Structured logging (slog), Prometheus metrics
- `internal/workers/` - Background workers (CronWorker for scheduled tasks)
- `internal/configs/` - Database, Redis, OpenAPI initialization
- `migrations/` - SQL migrations (auto-run on startup)
- `docs/` - Architecture documentation

**Dependency Injection - Root Aggregate Pattern:**
All dependencies wired using RootRepository and RootService aggregates:
```go
// In internal/handlers.go
rpts := repositories.NewRootRepository(ctx, db)
sevs := services.NewRootService(rpts, rdb)  // rdb = Redis client
resources.NewAccountResource(sevs).Routes(huma)  // Resources receive full RootService
```

**Benefits:**
- Single initialization point for all repos/services
- Redis client injected into all services
- Transaction support via `rpts.WithTx(ctx, tx)`
- Resources can easily access multiple services

**Caching Strategy:**
- **Layer:** Redis 8.4+ for caching and rate limiting
- **Pattern:** `FetchWithCache[T]()` generic helper with automatic metrics
- **TTLs:** 5-30 minutes depending on data type
- **Invalidation:** Wildcard patterns (e.g., `accounts:*`) after mutations
- **Metrics:** Prometheus tracks cache_hits_total and cache_misses_total

**Observability:**
- **Logging:** Structured JSON logs via slog (request ID, duration, status)
- **Metrics:** Prometheus at `/metrics` (requests_total, request_duration_seconds, http_errors_total, cache metrics)
- **Tracing:** Unique request ID per request via ObservabilityMiddleware
- **Rate Limiting:** Redis-based sliding window, 100 req/min per IP (production only)

**Database:**
- 8 core tables: accounts, categories, transactions, transaction_relations, tags, transaction_tags, budgets, budget_templates, transaction_templates
- Soft deletes via `deleted_at` timestamp
- Foreign keys with CASCADE DELETE or SET NULL
- ~30 optimized indexes
- Small `DBQuerier` interface (Query/QueryRow/Exec) for testing flexibility

**Background Workers:**
- TransactionTemplateWorker - Processes recurring transaction templates (hourly)
- BudgetTemplateWorker - Creates budgets from templates (daily)
- Workers receive Redis client for cache invalidation
- Graceful shutdown via context cancellation
- Fault-tolerant (individual failures logged, don't stop worker)

**Key Docs to Consult:**
- `apps/backend/docs/ARCHITECTURE.md` - System architecture with caching and observability
- `apps/backend/docs/CODE_PATTERNS.md` - Root* aggregates, caching patterns, Repository/Service/Resource
- `apps/backend/docs/MAIN_AND_HANDLERS.md` - Startup sequence, middleware stack, route registration
- `apps/backend/docs/MIDDLEWARES.md` - All 4 middlewares (Observability, RateLimit, CORS, Session)
- `apps/backend/docs/CODE_FLOW.md` - Request flows with caching (cache hit/miss)
- `apps/backend/docs/WORKERS.md` - Background worker patterns with cache invalidation
- `apps/backend/docs/CONCURRENCY.md` - Goroutine safety, Redis client concurrency
- `apps/backend/docs/MIGRATIONS.md` - Database schema and migration guide

### Backend E2E Tests Architecture

**Type-Safe Playwright Tests with Isolated Docker Environment**

**Key Directories:**
- `fixtures/` - Type-safe API client fixtures (base-client, auth-client, account-client, etc.)
- `specs/` - Test specifications organized by endpoint (auth/, accounts/, categories/, transactions/)
- `types/` - OpenAPI-generated types (auto-generated, never edit manually)

**Important Patterns:**
- All API types auto-generated from OpenAPI spec via `bun run generate:types`
- Global authentication setup (no per-test login needed)
- Custom fixtures provide clean API clients: `authAPI`, `accountAPI`, `categoryAPI`, `transactionAPI`
- Tests follow AAAC pattern: Arrange, Act, Assert, Cleanup
- Use `test.beforeAll`/`test.afterAll` for shared setup/teardown

**Test Organization:**
- CRUD tests: `{resource}.spec.ts` (e.g., `accounts.spec.ts`)
- Business requirements: `{feature}-{description}.spec.ts` (e.g., `type-conversions.spec.ts`)
- Advanced features: `advanced-{feature}.spec.ts` (e.g., `advanced-filtering.spec.ts`)
- Edge cases: `{feature}-edge-cases.spec.ts`

**Key Docs to Consult:**
- `apps/backend-bdd/docs/test-patterns.md` - **START HERE for writing tests**
- `apps/backend-bdd/docs/setup.md` - Environment setup
- `apps/backend-bdd/docs/authentication.md` - Auth flow
- `apps/backend-bdd/docs/type-generation.md` - OpenAPI type generation

### Frontend Web Architecture

**Multi-Layer Routing System (4 layers)**

```
1. Page Routes (/router/page/*)        - Full page views
2. Drawer Routes (/router/drawer/*)    - Side panel overlays
3. Modal Routes (/router/modal/*)      - Dialog overlays
4. Bottom Sheet Routes (/router/bottom-sheet/*) - Mobile sheets
```

**Key Directories:**
- `src/components/` - Reusable components (app-layout, floating-actions, etc.)
- `src/constant/` - Route constants (page-routes.ts, drawer-routes.ts, modal-routes.ts)
- `src/hooks/` - Custom hooks (use-api/, use-session/, use-*-state/)
- `src/lib/` - Pure utility functions (format-date, format-price, format-data)
- `src/providers/` - React Context providers (auth, session, drawer, modal, bottom-sheet)
- `src/router/` - Routing configuration for all 4 layers
- `src/types/` - TypeScript types (schemas.ts for custom, generated/ for OpenAPI)
- `src/ui/` - UI components (account-card, category-card, transaction-card)

**State Management:**
- **Providers** for app-level state (SessionProvider, AuthProvider, DrawerProvider, ModalProvider, BottomSheetProvider)
- **TanStack Query** for server state
- **Custom hooks** for logic reuse

**API Integration:**
- All API types auto-generated from backend OpenAPI spec
- Run `bun run generate:types` after backend schema changes
- Type-safe API hooks in `hooks/use-api/`

**Naming Conventions:**
- Components: kebab-case files, PascalCase exports (e.g., `account-card.tsx` exports `AccountCard`)
- Hooks: kebab-case with `use-` prefix (e.g., `use-session.ts`)
- Utils: kebab-case (e.g., `format-date.ts`)
- Barrel exports (`index.ts`) for clean imports

**Key Docs to Consult:**
- `apps/frontend-web/docs/routing.md` - Multi-layer routing architecture
- `apps/frontend-web/docs/state-management.md` - Provider patterns
- `apps/frontend-web/docs/conventions.md` - File structure and naming
- `apps/frontend-web/docs/api-integration.md` - Working with backend API

## Working in the Codebase

### Always Use Full Paths

When referencing files, use full paths from repository root:
- ✅ `apps/backend/internal/services/account_service.go`
- ❌ `internal/services/account_service.go`

### Change Working Directory

Always `cd` to the appropriate app directory before running commands:
```bash
cd apps/backend      # for backend work
cd apps/backend-bdd  # for backend E2E tests
cd apps/frontend-web # for web work
```

### Multi-App Changes

If changes affect multiple apps:
1. Start with backend (schema changes, API endpoints)
2. Update backend E2E tests
3. Update frontend (regenerate types, update UI)
4. Test integration

### Type Generation Workflow

After backend schema changes:
1. Backend defines new models/endpoints
2. Backend E2E: `cd apps/backend-bdd && bun run generate:types`
3. Frontend Web: `cd apps/frontend-web && bun run generate:types`

## Backend Development Guidelines

### RootRepository Aggregate Pattern

All repositories organized into single aggregate with transaction support:

```go
type RootRepository struct {
    Pool *pgxpool.Pool
    Acc  AccountRepository
    Cat  CategoryRepository
    Tsct TransactionRepository
    // ... all other repositories
}

// Single initialization
rpts := repositories.NewRootRepository(ctx, db)

// Transaction support
txRepo := rpts.WithTx(ctx, tx)  // All repos now use transaction
```

### Repository Pattern

Individual repositories receive `DBQuerier` interface (not *pgxpool.Pool):

```go
type AccountRepository struct {
    db DBQuerier  // Can be pool or transaction
}

func (r AccountRepository) List(ctx context.Context, params) (response, error) {
    // Always filter soft deletes: WHERE deleted_at IS NULL
    // Handle pagination, sorting, counting
}

func (r AccountRepository) Create(ctx context.Context, req) (model, error) {
    // INSERT with RETURNING for created fields
}
```

### RootService Aggregate Pattern

All services organized into single aggregate with Redis client:

```go
type RootService struct {
    Acc  AccountService
    Cat  CategoryService
    Tsct TransactionService
    // ... all other services
}

// Single initialization with Redis
sevs := services.NewRootService(rpts, rdb)
```

### Service Pattern with Caching

Services receive `*RootRepository` and `*redis.Client`:

```go
type AccountService struct {
    repo *repositories.RootRepository
    rdb  *redis.Client
}

// List with caching
func (s AccountService) List(ctx context.Context, params) (response, error) {
    cacheKey := common.BuildCacheKey(0, params, "accounts:list")

    return common.FetchWithCache(
        ctx, s.rdb, cacheKey, 10*time.Minute,
        func(ctx context.Context) (response, error) {
            return s.repo.Acc.List(ctx, params)
        },
        "accounts",  // Prometheus metric label
    )
}

// Create with cache invalidation
func (s AccountService) Create(ctx context.Context, req) (response, error) {
    result, err := s.repo.Acc.Create(ctx, req)
    if err != nil {
        return response{}, err
    }

    // Invalidate affected caches
    common.InvalidateCache(ctx, s.rdb, "accounts:*")

    return result, nil
}
```

### Resource Pattern

Resources receive full RootService aggregate:

```go
type AccountResource struct {
    sevs services.RootService  // Full service aggregate
}

func (r AccountResource) Routes(api huma.API) {
    huma.Get(api, "GET /accounts", r.List)
    huma.Post(api, "POST /accounts", r.Post)
}

func (r AccountResource) Post(ctx context.Context, req *struct {
    Body models.CreateAccountRequestModel
}) (*struct {
    Body models.CreateAccountResponseModel
    StatusCode int
}, error) {
    // Access specific service via fields
    resp, err := r.sevs.Acc.Create(ctx, req.Body)
    if err != nil {
        return nil, huma.Error400BadRequest("Failed to create account", err)
    }
    return &struct {
        Body models.CreateAccountResponseModel
        StatusCode int
    }{Body: resp, StatusCode: http.StatusCreated}, nil
}
```

### Critical Patterns

**Root Aggregates:** Use RootRepository and RootService for centralized initialization
**Caching:** Use `common.FetchWithCache[T]()` for reads, `common.InvalidateCache()` for mutations
**Cache Keys:** Use `common.BuildCacheKey(id, params, parts...)` for consistent keys
**Cache Invalidation:** Use wildcard patterns (e.g., `"accounts:*"`) to clear related caches
**TTLs:** 5-15 min for lists, 10-30 min for entities, 5-10 min for statistics
**Soft Deletes:** Always filter by `deleted_at IS NULL` in List/Get queries
**Error Wrapping:** Use `fmt.Errorf("%w", err)` to preserve error context
**Huma Errors:** Use helpers like `huma.Error400BadRequest()`, `huma.Error404NotFound()`
**Schema Tags:** Use struct tags for validation (`required:"true"`, `minLength:"1"`) and OpenAPI docs (`doc:"description"`)
**No Custom JSON Marshal:** Do NOT add custom JSON marshal/unmarshal to schema structs
**DBQuerier Interface:** Repositories use small `DBQuerier` interface (Query/QueryRow/Exec) for flexibility

## Frontend Web Guidelines

### Multi-Layer Navigation

```typescript
// Navigate to page
navigate(PAGE_ROUTES.DASHBOARD);

// Open drawer overlay
openDrawer(DRAWER_ROUTES.ACCOUNT_CREATE);

// Open modal
openModal(MODAL_ROUTES.LOGOUT_CONFIRMATION);
```

### API Integration

```typescript
import { useGetAccounts, useCreateAccount } from "@/hooks/use-api";

const { data: accounts } = useGetAccounts();
const createAccount = useCreateAccount();
```

### Format Utilities

```typescript
import { formatDate, DateFormat } from "@/lib/format-date";
import { formatPrice, PriceFormat } from "@/lib/format-price";

formatDate(new Date(), DateFormat.MEDIUM_DATE); // "Jan 4, 2024"
formatPrice(1234.56, PriceFormat.CURRENCY); // "Rp1.234,56"
```

### Critical Patterns

**Type Safety:** Always use TypeScript strictly (no `any`)
**API Types:** Never manually define API types, always use generated types
**Routing Layers:** Understand 4-layer system (Page/Drawer/Modal/BottomSheet)
**State Management:** Use Providers for cross-cutting concerns, TanStack Query for server state
**Naming:** Follow conventions in `apps/frontend-web/docs/conventions.md`
**File Structure:** Use barrel exports (`index.ts`) for clean imports

## Backend E2E Testing Guidelines

### Test Structure

```typescript
import { test, expect } from "../../fixtures";

test.describe("Account Tests", () => {
  test.use({ authenticatedContext: {} as any });

  test("should create account", async ({ accountAPI }) => {
    const response = await accountAPI.createAccount({
      name: "Test Account",
      accountType: "checking",
      currency: "USD",
      amount: 1000,
    });

    expect(response.status).toBe(201);
    expect(response.data?.id).toBeDefined();
  });
});
```

### Critical Patterns

**Type Safety:** All types from `components['schemas']` in `types/openapi.ts`
**No Manual Types:** Never define API types manually
**Authentication:** Global setup handles auth (use `test.use({ authenticatedContext: {} as any })`)
**Clean Tests:** Focus on assertions, fixtures handle API calls
**AAAC Pattern:** Arrange, Act, Assert, Cleanup
**Test Organization:** Follow patterns in `apps/backend-bdd/docs/test-patterns.md`

## Common Workflows

### Adding a New Backend Endpoint

1. Define model in `internal/models/` with validation tags
2. Add repository methods in `internal/repositories/{resource}_repository.go`
   - Receive `DBQuerier` interface, not *pgxpool.Pool
   - Always filter `deleted_at IS NULL` in queries
3. Add repository to `RootRepository` in `internal/repositories/root_repository.go`
4. Add service methods in `internal/services/{resource}_service.go`
   - Receive `*RootRepository` and `*redis.Client`
   - Use `common.FetchWithCache[T]()` for list/get operations
   - Use `common.InvalidateCache()` after mutations
5. Add service to `RootService` in `internal/services/root_service.go`
6. Create resource in `internal/resources/{resource}_resource.go`
   - Receive `RootService` aggregate
   - Access specific service via fields (e.g., `r.sevs.Acc`)
   - Register routes via `.Routes(api huma.API)` method
7. Wire resource in `internal/handlers.go` RegisterPrivateRoutes
   - Already wired via RootService - just call `resources.NewXResource(sevs).Routes(huma)`
8. Run tests: `cd apps/backend && go test ./... -v`
9. Update E2E tests: `cd apps/backend-bdd && bun run test`
10. Regenerate API types: `cd apps/frontend-web && bun run generate:types`

### Adding a New Frontend Page

1. Add route constant in `src/constant/page-routes.ts`
2. Create page component in `src/router/page/`
3. Add route to `src/router/page/page-router.tsx`
4. (Optional) Add FAB configuration in route handle
5. Test: `cd apps/frontend-web && bun run dev`

### Database Schema Changes

1. Create new migration files: `{number}_{description}.up.sql` and `{number}_{description}.down.sql`
2. Place in `apps/backend/migrations/`
3. Migrations run automatically on app startup
4. Test rollback manually: `psql -U postgres -d spenicle < migrations/{file}.down.sql`

## Docker & Deployment

**Development:**
- Backend: `cd apps/backend && docker compose up -d` (PostgreSQL + Redis)
- Backend E2E: `cd apps/backend-bdd && sudo docker compose up -d` (isolated test environment)

**Production:**
- Docker image: `ghcr.io/dimasbaguspm/spenicle:latest`
- Default port: 3000
- Requires: PostgreSQL 15+, Redis 8.4+
- See root `README.md` for Docker Compose setup

## Important Notes

- **Monorepo Structure:** Each app is self-contained, respect boundaries
- **Documentation First:** Check `apps/{app}/docs/` before making changes
- **Test Appropriately:** Unit tests within app, E2E tests in backend-bdd
- **Type Generation:** Always regenerate types after backend schema changes
- **Caching:** Use `FetchWithCache[T]()` for reads, `InvalidateCache()` for mutations
- **Observability:** All requests logged with request ID, metrics tracked in Prometheus
- **Rate Limiting:** Production only, 100 req/min per IP via Redis sliding window
- **Root Aggregates:** Use RootRepository and RootService for centralized DI
- **Graceful Shutdown:** Backend workers handle context cancellation properly
- **Soft Deletes:** All tables support soft delete pattern with `deleted_at`
- **Environment Config:** Backend E2E uses `docker-compose.yml`, not `.env` files

## Resources

- **Backend API Docs:** http://localhost:3000/api/docs (when running)
- **Prometheus Metrics:** http://localhost:3000/metrics (requests, cache hits/misses, duration)
- **Health Check:** http://localhost:3000/health
- **GitHub Issues:** https://github.com/dimasbaguspm/spenicle/issues
- **Copilot Instructions:** `.github/copilot-instructions.md` (comprehensive monorepo guide)
