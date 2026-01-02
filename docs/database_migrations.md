# Database Migrations

## Overview

This project uses [golang-migrate/migrate](https://github.com/golang-migrate/migrate) to manage database schema migrations. Migrations run automatically on application startup, ensuring the database schema is always up-to-date.

## Architecture

- **Migration files**: Located in `internal/database/migrations/`
- **Migration runner**: Implemented in `internal/configs/migrations.go`
- **Auto-execution**: Runs in `main.go` after environment validation and before route setup
- **Database driver**: PostgreSQL

## Migration Files

Migrations follow the naming convention:

```
{version}_{name}.up.sql    - Forward migration
{version}_{name}.down.sql  - Rollback migration
```

**Example:**

```
000001_init.up.sql
000001_init.down.sql
000002_add_user_table.up.sql
000002_add_user_table.down.sql
```

### Up Migrations (`*.up.sql`)

Applies schema changes (create tables, add columns, create indexes, etc.)

**Example:**

```sql
-- 000001_init.up.sql
CREATE TYPE account_type AS ENUM ('expense', 'income');

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type account_type NOT NULL DEFAULT 'expense',
    note TEXT,
    amount INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at);
```

### Down Migrations (`*.down.sql`)

Reverts schema changes (should be exact opposite of up migration)

**Example:**

```sql
-- 000001_init.down.sql
DROP TABLE IF EXISTS accounts;
DROP TYPE IF EXISTS account_type;
```

## How It Works

### Automatic Migration on Startup

When the application starts (`main.go`):

1. Environment variables are loaded and validated
2. **Migrations are executed automatically**
3. Database connection pool is initialized
4. Routes are registered and server starts

**Code flow in `main.go`:**

```go
func main() {
    // ... context and environment setup ...

    // Run database migrations
    logger.Log().Info("Running database migrations...")
    migration := configs.NewMigration(env.DatabaseURL, "internal/database/migrations")
    if err := migration.Up(); err != nil {
        logger.Log().Error("failed to run migrations", "error", err)
        panic(err)
    }
    logger.Log().Info("Database migrations completed successfully")

    // ... continue with app setup ...
}
```

### Migration Logic

The `Migration` struct in `internal/configs/migrations.go` provides:

- `Up()` - Run all pending migrations
- `Down()` - Rollback last migration
- `Version()` - Get current migration version

**Key behavior:**

- ✅ **Idempotent**: Running `Up()` multiple times is safe (no-op if already up-to-date)
- ✅ **Transactional**: Each migration runs in a transaction (atomic)
- ✅ **Version tracking**: Stores migration state in `schema_migrations` table
- ✅ **Error handling**: Fails fast on migration errors (prevents partial application)

## Creating New Migrations

### Step 1: Create Migration Files

Create two files with the next version number:

```bash
# Example: Adding a users table (version 2)
touch internal/database/migrations/000002_add_users_table.up.sql
touch internal/database/migrations/000002_add_users_table.down.sql
```

### Step 2: Write the Up Migration

```sql
-- 000002_add_users_table.up.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

### Step 3: Write the Down Migration

```sql
-- 000002_add_users_table.down.sql
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_username;
DROP TABLE IF EXISTS users;
```

### Step 4: Test the Migration

**Option 1: Restart the application**

```bash
# Application will automatically run pending migrations
go run main.go
```

**Option 2: Use migrate CLI** (for testing without app restart)

```bash
# Install migrate CLI
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Run migrations
migrate -path internal/database/migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" up

# Rollback last migration
migrate -path internal/database/migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" down 1
```

## Migration Best Practices

### ✅ DO

1. **Always create both up and down migrations**

   - Down should exactly reverse up
   - Test both directions

2. **Keep migrations small and focused**

   - One logical change per migration
   - Easier to review and rollback

3. **Use indexes for query performance**

   ```sql
   CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at);
   ```

4. **Use transactions** (automatic with migrate)

   - Each migration file runs in a transaction
   - All-or-nothing execution

5. **Add NOT NULL constraints carefully**

   ```sql
   -- Safe: New table
   CREATE TABLE users (
       name VARCHAR(255) NOT NULL
   );

   -- Risky: Existing table (requires data migration)
   ALTER TABLE accounts ADD COLUMN user_id INT NOT NULL;  -- Will fail if table has rows

   -- Better: Add nullable first, backfill data, then add constraint
   ALTER TABLE accounts ADD COLUMN user_id INT;
   -- Run data migration...
   ALTER TABLE accounts ALTER COLUMN user_id SET NOT NULL;
   ```

6. **Document complex migrations**
   ```sql
   -- Migration: Add user authentication
   -- Context: Supports multi-user feature (Issue #123)
   -- Breaking: Existing accounts will be owned by admin user
   ```

### ❌ DON'T

1. **Don't modify existing migration files**

   - Once deployed to production, migrations are immutable
   - Create a new migration to fix issues

2. **Don't use database-specific syntax without reason**

   - Prefer standard SQL when possible
   - Comment when PostgreSQL-specific features are required

3. **Don't add data migrations in schema migrations**

   - Keep schema changes (DDL) separate from data changes (DML)
   - Complex data migrations should be separate scripts

4. **Don't break backward compatibility carelessly**

   - Consider zero-downtime deployments
   - Use multi-step migrations for breaking changes:
     1. Add new column (nullable)
     2. Deploy code that writes to both columns
     3. Backfill data
     4. Deploy code that reads from new column
     5. Remove old column

5. **Don't forget foreign key constraints**

   ```sql
   -- Bad: No referential integrity
   CREATE TABLE transactions (
       account_id INT
   );

   -- Good: Enforces data integrity
   CREATE TABLE transactions (
       account_id INT NOT NULL,
       FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
   );
   ```

## Troubleshooting

### Migration Failed Mid-Execution

If a migration fails, the `schema_migrations` table marks it as "dirty":

```bash
# Check migration status
migrate -path internal/database/migrations -database "$DATABASE_URL" version

# Force set version (use with caution!)
migrate -path internal/database/migrations -database "$DATABASE_URL" force 1
```

**Recovery steps:**

1. Identify the failed migration in logs
2. Manually inspect the database state
3. Fix the issue (rollback changes if needed)
4. Force the version to the last successful migration
5. Re-run migrations

### "No Change" Error

Not an error - means database is already up-to-date:

```
INFO Database migrations completed successfully
```

This is expected behavior and handled automatically in the code.

### Migration Version Conflict

**Symptom:** Two developers create migrations with the same version number

**Solution:**

1. Rename the later migration to the next available version
2. Commit and push
3. Other developers will automatically apply the new migration

### Database Connection Issues

**Symptom:** `failed to run migrations: unable to connect to database`

**Solutions:**

1. Check `DATABASE_URL` environment variable
2. Verify database is running: `psql $DATABASE_URL`
3. Check network connectivity and firewall rules
4. Ensure database exists: `createdb dbname`

## Advanced Usage

### Programmatic Migration Control

The `Migration` struct provides manual control:

```go
import "github.com/dimasbaguspm/spenicle-api/internal/configs"

// Create migration instance
migration := configs.NewMigration(databaseURL, "internal/database/migrations")

// Run all pending migrations
if err := migration.Up(); err != nil {
    log.Fatal(err)
}

// Rollback last migration
if err := migration.Down(); err != nil {
    log.Fatal(err)
}

// Get current version
version, dirty, err := migration.Version()
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Current version: %d (dirty: %v)\n", version, dirty)
```

### Conditional Migration Execution

To disable automatic migrations (for testing or production control):

```go
// In main.go, comment out or wrap in conditional:
if os.Getenv("AUTO_MIGRATE") == "true" {
    migration := configs.NewMigration(env.DatabaseURL, "internal/database/migrations")
    if err := migration.Up(); err != nil {
        log.Fatal(err)
    }
}
```

## Production Considerations

### Deployment Strategy

**Option 1: Auto-migrate on startup (current approach)**

- ✅ Simple: No separate migration step
- ✅ Consistent: Always up-to-date
- ⚠️ Risk: Failed migration blocks startup
- ⚠️ Coordination: Multiple instances may race

**Option 2: Separate migration job**

```bash
# Run migrations before deployment
migrate -path ./migrations -database "$DATABASE_URL" up

# Then deploy application
kubectl rollout restart deployment/spenicle-api
```

### Zero-Downtime Migrations

For production systems with no downtime tolerance:

1. **Phase 1: Additive changes**

   - Add new columns/tables (don't remove old ones yet)
   - Deploy new code that uses new schema

2. **Phase 2: Remove old schema**
   - Once all instances use new schema
   - Remove deprecated columns/tables

**Example: Renaming a column**

```sql
-- DON'T DO THIS (breaks old app versions):
ALTER TABLE accounts RENAME COLUMN amount TO balance;

-- DO THIS (3-step approach):
-- Step 1: Add new column
ALTER TABLE accounts ADD COLUMN balance INT;
UPDATE accounts SET balance = amount;

-- (Deploy code that writes to both, reads from balance)

-- Step 2: (Next deployment) Remove old column
ALTER TABLE accounts DROP COLUMN amount;
```

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
```

## Integration with Code Standards

When adding a new endpoint that requires database changes:

1. ✅ Create migration files first (up/down)
2. ✅ Run/test migrations locally
3. ✅ Add schema DTOs in `internal/database/schemas/`
4. ✅ Update repository layer to use new schema
5. ✅ Update service layer with business logic
6. ✅ Add resource endpoints
7. ✅ Write tests for all layers
8. ✅ Document changes in `docs/account_service.md` or relevant doc

See [code_standards.md](code_standards.md) for complete workflow.
