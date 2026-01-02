# Database Migrations — Quick Guide

Where

- Migration files: `internal/database/migrations/` (use `{version}_{name}.up.sql` and `.down.sql`).
- Runner: `internal/configs/migrations.go` — application runs `Up()` on startup by default.

How to add a migration

1. Create two files with next version number:

```bash
touch internal/database/migrations/000002_add_users_table.up.sql
touch internal/database/migrations/000002_add_users_table.down.sql
```

2. Implement `up` (DDL) and matching `down` (reverse DDL).
3. Test by restarting app (auto-run) or using `migrate` CLI:

```bash
# Install migrate CLI
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Run
migrate -path internal/database/migrations -database "$DATABASE_URL" up
```

Best practices (short)

- Always provide both up and down migrations.
- Keep migrations small and reversible.
- Use transactions and document complex migrations.
- Avoid changing applied migration files; create a new migration instead.
- For breaking changes, use multi-step deploys (add nullable column → backfill → make non-null).

Troubleshooting

- If migrations fail, inspect logs and `schema_migrations` table; use `migrate version` and carefully `force` only when necessary.
- Ensure `DATABASE_URL` points to a running Postgres instance.

Notes

- Auto-migrate on startup is convenient but consider running migrations separately for production (CI/CD job) to avoid startup failures and races.
  -- DO THIS (3-step approach):
  -- Step 1: Add new column
  ALTER TABLE accounts ADD COLUMN balance INT;
  UPDATE accounts SET balance = amount;

-- (Deploy code that writes to both, reads from balance)

-- Step 2: (Next deployment) Remove old column
ALTER TABLE accounts DROP COLUMN amount;

````

## Reference

- [golang-migrate Documentation](https://github.com/golang-migrate/migrate)
- [PostgreSQL DDL Reference](https://www.postgresql.org/docs/current/ddl.html)
- [Migration Naming Best Practices](https://github.com/golang-migrate/migrate/blob/master/MIGRATIONS.md)

## Quick Commands

```bash
# Install migrate CLI
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Create new migration
migrate create -ext sql -dir internal/database/migrations -seq add_users_table

# Run migrations
go run main.go  # Automatic via app startup
# OR
migrate -path internal/database/migrations -database "$DATABASE_URL" up

# Rollback last migration
migrate -path internal/database/migrations -database "$DATABASE_URL" down 1

# Check current version
migrate -path internal/database/migrations -database "$DATABASE_URL" version

# Force version (after manual fixes)
migrate -path internal/database/migrations -database "$DATABASE_URL" force 1
````

## Integration with Code Standards

When adding a new endpoint that requires database changes:

- [ ] Create migration files first (up/down)
- [ ] Run/test migrations locally
- [ ] Add schema DTOs in `internal/database/schemas/`
- [ ] Update repository layer to use new schema
- [ ] Update service layer with business logic
- [ ] Add resource endpoints
- [ ] Write tests for all layers
- [ ] Document changes in `docs/account_service.md` or relevant doc

See [code_standards.md](code_standards.md) for complete workflow.
