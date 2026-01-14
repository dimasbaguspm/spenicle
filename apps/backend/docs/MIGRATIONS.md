# Migrations

Database migrations manage schema versioning and evolution. This backend uses SQL-based migrations with naming convention `{number}_{description}.{direction}.sql`.

## Migration System Overview

**Location:** `apps/backend/migrations/`

**Files:**

- `000001_init_schema.up.sql` - Initial schema with 8 tables
- `000001_init_schema.down.sql` - Rollback of initial schema
- `000002_enhance_transaction_templates.up.sql` - Add recurrence fields to templates
- `000002_enhance_transaction_templates.down.sql` - Rollback enhancements

**Execution:**

- Migrations run automatically on application startup via `configs.RunMigration(env)`
- Applied in numeric order (000001 before 000002)
- Only "up" files run during normal startup
- "Down" files used for rollback (manual execution)

## Migration Naming Convention

```
{number}_{description}.{direction}.sql

000001_init_schema.up.sql
│       │              │
│       │              └─ up: apply, down: rollback
│       └─ Human-readable description
└─ Sequential version number (3 digits)
```

**Rules:**

- Numbers must be unique and sequential
- Descriptions use snake_case
- Must have corresponding .up and .down files
- Numbers are zero-padded to 6 digits in production (but 3 digits here for simplicity)

## Migration 000001: Initial Schema

**Purpose:** Create foundational database schema with 8 core tables

### Tables Created

#### 1. accounts

```sql
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
    note TEXT,
    amount BIGINT NOT NULL DEFAULT 0,
    icon VARCHAR(50),
    icon_color VARCHAR(7),
    display_order INTEGER NOT NULL DEFAULT 0,
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Purpose:** User's financial accounts (bank accounts, credit cards, cash)

**Fields:**

- `type`: 'expense' or 'income' account
- `amount`: Current balance (in cents, no decimals)
- `display_order`: UI ordering
- `archived_at`: When account was archived (null if active)
- Soft delete via `deleted_at`

**Indexes:**

- `type` (filtered by deleted_at)
- `archived_at`
- `deleted_at`

---

#### 2. categories

```sql
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    note TEXT,
    icon VARCHAR(50),
    icon_color VARCHAR(7),
    display_order INTEGER NOT NULL DEFAULT 0,
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT unique_category_name_per_type UNIQUE (name, type, deleted_at)
);
```

**Purpose:** Transaction categorization

**Fields:**

- `type`: 'expense', 'income', or 'transfer'
- Unique constraint on (name, type, deleted_at) - allows same name for different types

**Indexes:** type, archived_at, deleted_at

---

#### 3. transactions

```sql
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    date DATE NOT NULL,
    amount BIGINT NOT NULL,
    note TEXT,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    destination_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Purpose:** Individual financial transactions

**Fields:**

- `date`: Transaction date (past, present, or future)
- `amount`: Transaction amount (positive, in cents)
- `destination_account_id`: Used for transfers (from account_id to destination)
- FK constraints with CASCADE/SET NULL

**Indexes:** type, date, account_id, category_id, deleted_at

---

#### 4. transaction_relations

```sql
CREATE TABLE transaction_relations (
    id BIGSERIAL PRIMARY KEY,
    source_transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    related_transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL CHECK (relation_type IN ('split', 'group')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_relation UNIQUE (source_transaction_id, related_transaction_id)
);
```

**Purpose:** Link related transactions (splits, groups)

**Fields:**

- `relation_type`: 'split' (one transaction split into many) or 'group' (multiple transactions grouped)
- Self-referencing foreign keys with CASCADE DELETE

**Indexes:** source_transaction_id, related_transaction_id

---

#### 5. tags

```sql
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Purpose:** Reusable transaction tags

**Fields:**

- `color`: Hex color code (optional)
- Soft delete via `deleted_at`

**Indexes:** deleted_at

---

#### 6. transaction_tags

```sql
CREATE TABLE transaction_tags (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_transaction_tag UNIQUE (transaction_id, tag_id)
);
```

**Purpose:** Many-to-many junction between transactions and tags

**Constraint:** Can't have duplicate (transaction, tag) pairs

**Indexes:** transaction_id, tag_id

---

#### 7. budgets

```sql
CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    amount_limit BIGINT NOT NULL,
    budget_template_id BIGINT REFERENCES budget_templates(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Purpose:** Budget limits for specific periods

**Fields:**

- `period_start` / `period_end`: Budget period dates
- `amount_limit`: Spending limit in cents
- `budget_template_id`: Link to recurring template (null if manual budget)

**Indexes:** period_start, period_end, budget_template_id, deleted_at

---

#### 8. budget_templates

```sql
CREATE TABLE budget_templates (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    amount_limit BIGINT NOT NULL,
    recurrence VARCHAR(20) NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'weekly', 'monthly', 'yearly')),
    start_date DATE,
    end_date DATE,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);
```

**Purpose:** Template for recurring budgets

**Fields:**

- `recurrence`: Schedule type (none, weekly, monthly, yearly)
- `start_date` / `end_date`: When template is active
- `last_executed_at`: Tracks when budget was last created from template

**Indexes:** recurrence, deleted_at, last_executed_at

---

#### 9. transaction_templates (Created by Migration 000002)

See "Migration 000002" section below.

## Migration 000002: Enhance Transaction Templates

**Purpose:** Add recurrence scheduling fields to transaction_templates table

**File:** `000002_enhance_transaction_templates.up.sql`

### Fields Added

```sql
ALTER TABLE transaction_templates ADD COLUMN recurrence VARCHAR(20) DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly'));
ALTER TABLE transaction_templates ADD COLUMN start_date DATE;
ALTER TABLE transaction_templates ADD COLUMN end_date DATE;
ALTER TABLE transaction_templates ADD COLUMN installment_count INTEGER;
ALTER TABLE transaction_templates ADD COLUMN installment_current INTEGER DEFAULT 0;
ALTER TABLE transaction_templates ADD COLUMN last_executed_at TIMESTAMP;
```

**New Fields:**

- `recurrence`: Daily/weekly/monthly/yearly schedule
- `start_date`: When template becomes active
- `end_date`: When template expires (null = indefinite)
- `installment_count`: For installment plans (e.g., 12-month subscription)
- `installment_current`: Current installment number
- `last_executed_at`: Tracks when worker last processed template

### Indexes Added

```sql
CREATE INDEX idx_transaction_templates_recurrence ON transaction_templates(recurrence)
WHERE deleted_at IS NULL;

CREATE INDEX idx_transaction_templates_last_executed ON transaction_templates(last_executed_at)
WHERE deleted_at IS NULL;

CREATE INDEX idx_transaction_templates_dates ON transaction_templates(start_date, end_date)
WHERE deleted_at IS NULL AND recurrence != 'none';
```

**Purpose:** Optimize worker queries when finding templates due for processing

---

## Running Migrations

### Automatic (Application Startup)

```go
// In main.go
if err := configs.RunMigration(env); err != nil {
    panic(err)
}
```

- Runs on every application startup
- Checks which migrations have been applied
- Applies only new migrations (idempotent)
- Stores applied migration history in `schema_migrations` table

### Manual Rollback

To rollback migration 000002:

```bash
# Manually execute:
psql -U postgres -d spenicle < apps/backend/migrations/000002_enhance_transaction_templates.down.sql
```

**Important:**

- Rollback is destructive (removes columns, drops tables)
- Down migrations should reverse up migrations exactly
- Test rollbacks in development first

---

## Migration Best Practices

### Writing New Migrations

1. **Create paired files:**

   ```
   000003_description.up.sql
   000003_description.down.sql
   ```

2. **Up migration pattern:**

   ```sql
   -- Create table
   CREATE TABLE IF NOT EXISTS new_table (
       id BIGSERIAL PRIMARY KEY,
       -- columns
       created_at TIMESTAMP NOT NULL DEFAULT NOW()
   );

   -- Create indexes
   CREATE INDEX idx_new_table_field ON new_table(field)
   WHERE deleted_at IS NULL;
   ```

3. **Down migration pattern:**

   ```sql
   -- Drop in reverse order of creation
   DROP INDEX IF EXISTS idx_new_table_field;
   DROP TABLE IF EXISTS new_table CASCADE;
   ```

4. **Guidelines:**
   - Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
   - Drop dependent objects before base objects
   - Include indexes for performance
   - Add soft delete support (`deleted_at TIMESTAMP`)
   - Use CHECK constraints for enums
   - Add FK constraints with appropriate CASCADE behavior

### Foreign Key Strategy

**CASCADE DELETE:** Use when related records must be deleted

```sql
FOREIGN KEY (parent_id) REFERENCES parent(id) ON DELETE CASCADE
```

**SET NULL:** Use when relation is optional

```sql
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
```

**RESTRICT:** Use when deletion should be prevented (not used here)

### Soft Delete Pattern

All tables include `deleted_at TIMESTAMP` column:

```sql
CREATE TABLE example (
    id BIGSERIAL PRIMARY KEY,
    deleted_at TIMESTAMP  -- null when active, NOW() when deleted
);

-- Index for efficiency
CREATE INDEX idx_example_deleted_at ON example(deleted_at);
```

**Benefits:**

- Logical deletion (preserves data integrity)
- Enables "undo" operations
- Maintains referential integrity
- Data recovery possible

**Usage in queries:**

```sql
SELECT * FROM example WHERE deleted_at IS NULL;  -- Active records only
SELECT * FROM example;  -- All records including deleted
```

### Performance Considerations

**Indexing strategy:**

- Index FK columns for JOINs
- Index frequently filtered columns
- Index soft delete column
- Use filtered indexes for soft delete: `WHERE deleted_at IS NULL`
- Multi-column indexes for common WHERE clauses

**Current indexes:**

- ~30 indexes across all tables
- Optimized for worker queries (templates due for processing)
- Optimized for list queries (pagination with soft delete filtering)

---

## Schema Evolution Timeline

```
Initial State (000001)
├─ 8 tables: accounts, categories, transactions, transaction_relations, tags, transaction_tags, budgets, budget_templates, transaction_templates
└─ ~30 indexes

After 000002
└─ transaction_templates enhanced with recurrence fields + 3 new indexes

Future Migrations
├─ 000003_add_feature_x
├─ 000004_add_feature_y
└─ ... (follow same pattern)
```

## Troubleshooting Migrations

**Problem: Migration fails to apply**

- Check syntax errors in SQL file
- Verify database connection
- Check for name conflicts (table/index already exists)

**Problem: Schema mismatch in application**

- Verify migrations ran: `SELECT * FROM schema_migrations;`
- Check `.up` and `.down` file consistency
- Ensure migrations run in order (don't skip numbers)

**Problem: Need to modify applied migration**

- Create a new migration file (never modify applied migrations)
- Write UP and DOWN migrations for the change
- Test DOWN to ensure rollback works

---

## Useful SQL Queries

**Check applied migrations:**

```sql
SELECT version, dirty FROM schema_migrations ORDER BY version;
```

**List all tables:**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

**List all indexes:**

```sql
SELECT indexname FROM pg_indexes WHERE schemaname = 'public';
```

**Check table structure:**

```sql
\d table_name;  -- In psql
```

**Check foreign keys:**

```sql
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'transactions';
```
