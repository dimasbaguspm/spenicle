# Copilot / Coding Agent Instructions

## Repository Structure

This is a **monorepo** containing multiple applications:

```
spenicle/
├── apps/
│   ├── backend/     # Go REST API
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

#### Web (`apps/web/`)

(Guidelines will be added when web app is developed)

#### CLI (`apps/cli/`)

(Guidelines will be added when CLI is developed)

### General Principles

1. **Respect app boundaries:** Each app is self-contained
2. **Check docs first:** Look in `apps/{app}/docs/` for specifics
3. **Test appropriately:**
   - Unit tests within the app
   - Integration tests where apps interact
   - E2E tests in `e2e/` for full system
4. **Update docs:** Keep documentation in sync
5. **Propose options:** If unsure, present 2 options to the user

### File Paths

Always use full paths from repository root:

- ✅ `apps/backend/internal/services/account_service.go`
- ❌ `internal/services/account_service.go`

### Multi-App Changes

If changes affect multiple apps:

1. Plan the full scope first
2. Update each app in dependency order (backend → frontend → cli)
3. Update e2e tests to match
4. Test the integration

### Documentation Structure

- **Root:** General monorepo info (`index.md`, this file)
- **App-specific:** `apps/{app}/docs/` contains detailed technical docs
- **E2E:** Test-specific documentation under `e2e/docs/` (if needed)

### Quick Reference

**Where to find:**

- Architecture & patterns → `apps/backend/docs/code_standards.md`
- Testing guidelines → `apps/backend/docs/testing_standards.md`
- API documentation → `apps/backend/docs/{feature}_service.md`
- Database schema → `apps/backend/internal/database/migrations/`
- Schema examples → `apps/backend/internal/database/schemas/`

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
