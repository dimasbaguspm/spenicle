# Copilot / Coding Agent Instructions

## Repository Structure

This is a **monorepo** containing multiple applications:

```
spenicle/
├── apps/
│   ├── backend/     # Go REST API
│   ├── backend-bdd/ # Backend E2E tests (Playwright)
│   ├── web/         # Web frontend
│   └── cli/         # CLI application
├── e2e/             # End-to-end tests
├── .github/         # GitHub config & workflows
└── scripts/         # Build/deployment scripts
```

## Working with This Codebase

### Identify the Context

Before making changes, determine which app you're working on:

- **Backend (Go API):** Check `apps/backend/docs/` for specific guidelines
- **Backend E2E Tests:** Check `apps/backend-bdd/docs/` for test patterns
- **Web Frontend:** Check `apps/web/docs/` (when available)
- **CLI:** Check `apps/cli/docs/` (when available)
- **E2E Tests:** Mirror the app structure under `e2e/`

### Application-Specific Guidelines

#### Backend (`apps/backend/`)

Follow this checklist for backend work:

- **Code standards:** Check `apps/backend/docs/code_standards.md` for Go-specific patterns
- **Testing standards:** Refer to `apps/backend/docs/testing_standards.md`
- **Feature context:** Review relevant docs in `apps/backend/docs/`:
  - Account work → `account_service.md`
  - Category work → `category_service.md`
  - Transaction work → `transaction_service.md`
  - Budget work → `budget_feature.md`
  - etc.
- **Database changes:** Follow `apps/backend/docs/database_migrations.md`
- **Plan:** For multi-step tasks, create a `manage_todo_list` entry
- **Tests:** Run `go test ./... -v` from `apps/backend/` before finishing
- **Add tests:** Any behavior change must include tests (unit and/or endpoint)
- **Schemas:** Do NOT add custom JSON marshal/unmarshal to schema structs
- **Errors:** Use Huma helpers (e.g., `huma.Error400BadRequest`)
- **DB:** Repositories use the small `DB` interface (QueryRow/Query/Exec)
- **Keep changes small:** Prefer focused diffs

**Backend Quick Commands:**

```bash
cd apps/backend
go test ./... -v              # run all tests
gofmt -w .                    # format code
go build ./...                # build
docker-compose up -d          # start PostgreSQL
```

Backend E2E Tests (`apps/backend-bdd/`)

Follow this checklist for backend E2E test work:

- **Documentation:** Check `apps/backend-bdd/docs/` for comprehensive guides:
  - Setup & Docker environment → `setup.md`
  - Authentication & global setup → `authentication.md`
  - Type generation from OpenAPI → `type-generation.md`
  - Fixture architecture → `fixture-architecture.md`
  - Test writing patterns → `writing-tests.md`
- **Type Safety:** All types auto-generated from OpenAPI spec
- **No manual types:** Always use `components['schemas']` from `types/openapi.ts`
- **Authentication:** Global setup handles auth (no per-test login)
- **Docker:** Isolated environment (`docker-compose.yml` in backend-bdd/)
- **Environment:** Configure via `.env` (copy from `.env.example`)
- **Clean tests:** Tests auto-authenticated, focus on assertions only
- **Test patterns:** Follow AAA pattern (Arrange, Act, Assert, Cleanup)
- **Schema sync:** Run `bun run generate:types` after backend schema changes

**Backend E2E Quick Commands:**

```bash
cd apps/backend-bdd
bun install                   # install dependencies
cp .env.example .env          # create environment file
sudo docker compose up -d     # start isolated backend + PostgreSQL
bun run test                  # run all E2E tests
bun run generate:types        # regenerate OpenAPI types
sudo docker compose down -v   # stop and clean environment
```

####

#### Web (`apps/web/`)

Follow this checklist for web frontend work:

- **Documentation:** Check `apps/web/README.md` for overview and `apps/web/docs/` for specifics
- **Key docs:**
  - Architecture & routing → `apps/web/docs/routing.md`
  - State management → `apps/web/docs/state-management.md`
  - Code conventions → `apps/web/docs/conventions.md`
  - API integration → `apps/web/docs/api-integration.md`
- **Type safety:** Always use TypeScript strictly (no `any`)
- **API types:** Run `bun run generate:openapi-types` after backend schema changes
- **Routing layers:** Understand the 4-layer system (Page/Drawer/Modal/BottomSheet)
- **State:** Use Providers for cross-cutting concerns, TanStack Query for server state
- **Naming:** Follow conventions in `apps/web/docs/conventions.md`
  - Components: kebab-case files, PascalCase names (e.g., `account-card.tsx` exports `AccountCard`)
  - Hooks: kebab-case with `use-` prefix (e.g., `use-session.ts`)
  - Utils: kebab-case (e.g., `format-date.ts`)
- **File structure:** Use barrel exports (`index.ts`) for clean imports
- **Testing:** Add tests for complex logic and user interactions

**Web Quick Commands:**

```bash
cd apps/web
bun install                     # install dependencies
bun run dev                     # start dev server
bun run generate:openapi-types  # generate API types
bun run build                   # build for production
```

#### CLI (`apps/cli/`)

(Guidelines will be added when CLI is developed)

### General Principles

1. **Respect app boundaries:** Each app is self-contained
2. **Check docs first:** Look in `apps/{app}/docs/` for specifics
3. **Test appropriately:**
   - Unit tests within the app

- Architecture & patterns → `apps/backend/docs/code_standards.md`
- Testing guidelines → `apps/backend/docs/testing_standards.md`
- API documentation → `apps/backend/docs/{feature}_service.md`
- Database schema → `apps/backend/internal/database/migrations/`
- Schema examples → `apps/backend/internal/database/schemas/`

- **Backend E2E Tests:**
  - Setup & environment → `apps/backend-bdd/docs/setup.md`
  - Authentication flow → `apps/backend-bdd/docs/authentication.md`
  - Type generation → `apps/backend-bdd/docs/type-generation.md`
  - Fixture patterns → `apps/backend-bdd/docs/fixture-architecture.md`
  - Writing tests → `apps/backend-bdd/docs/writing-tests.md`
  - Test examples → `apps/backend-bdd/spec

Always use full paths from repository root:

- ✅ `apps/backend/internal/services/account_service.go`
- ❌ `internal/services/account_service.go`

### Multi-App Changes

If changes affect # for backend work
cd apps/backend-bdd # for backend E2E tests
cd apps/web # for web work
cd apps/cli # for CLI work
cd e2e ate each app in dependency order (backend → frontend → cli) 3. Update e2e tests to match 4. Test the integration

### Documentation Structure

- **Root:** General monorepo info (`index.md`, this file)
- **App-specific:** `apps/{app}/docs/` contains detailed technical docs
- **E2E:** Test-specific documentation under `e2e/docs/` (if needed)

### Quick Reference

**Where to find:**

- **Backend:**

  - Architecture & patterns → `apps/backend/docs/code_standards.md`
  - Testing guidelines → `apps/backend/docs/testing_standards.md`
  - API documentation → `apps/backend/docs/{feature}_service.md`
  - Database schema → `apps/backend/internal/database/migrations/`
  - Schema examples → `apps/backend/internal/database/schemas/`

- **Web:**
  - Overview → `apps/web/README.md`
  - Routing system → `apps/web/docs/routing.md`
  - State management → `apps/web/docs/state-management.md`
  - Code conventions → `apps/web/docs/conventions.md`
  - API integration → `apps/web/docs/api-integration.md`
  - Component examples → `apps/web/src/components/`
  - Provider examples → `apps/web/src/providers/`

**Working directory:**
Always `cd` to the appropriate app directory before running commands:

```bash
cd apps/backend  # for backend work
cd apps/web      # for web work
cd apps/cli      # for CLI work
cd e2e           # for e2e tests
```

### Notes

- Docs under `apps/*/docs/` are condensed quick references
- When in doubt, prefer code and schema files as source of truth
- Add examples/tests rather than expanding docs inline
- Each app may have different tech stacks and conventions
