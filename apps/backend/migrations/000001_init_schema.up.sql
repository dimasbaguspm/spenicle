-- Create accounts table
CREATE TABLE
    IF NOT EXISTS accounts (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income')),
        note TEXT,
        amount BIGINT NOT NULL DEFAULT 0,
        icon VARCHAR(50),
        icon_color VARCHAR(7),
        display_order INTEGER NOT NULL DEFAULT 0,
        archived_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP
    );

CREATE INDEX idx_accounts_type ON accounts (type)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_accounts_archived_at ON accounts (archived_at)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_accounts_deleted_at ON accounts (deleted_at);

-- Create categories table
CREATE TABLE
    IF NOT EXISTS categories (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        note TEXT,
        icon VARCHAR(50),
        icon_color VARCHAR(7),
        display_order INTEGER NOT NULL DEFAULT 0,
        archived_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP,
        CONSTRAINT unique_category_name_per_type UNIQUE (name, type, deleted_at)
    );

CREATE INDEX idx_categories_type ON categories (type)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_categories_archived_at ON categories (archived_at)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_categories_deleted_at ON categories (deleted_at);

-- Create transactions table
CREATE TABLE
    IF NOT EXISTS transactions (
        id BIGSERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        date DATE NOT NULL,
        amount BIGINT NOT NULL CHECK (amount > 0),
        account_id BIGINT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
        category_id BIGINT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
        destination_account_id BIGINT REFERENCES accounts (id) ON DELETE CASCADE,
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP
    );

CREATE INDEX idx_transactions_date ON transactions (date)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transactions_account_id ON transactions (account_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transactions_category_id ON transactions (category_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transactions_destination_account_id ON transactions (destination_account_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transactions_type ON transactions (type)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transactions_deleted_at ON transactions (deleted_at);

-- Create transaction_relations table (for transaction groups/splits)
CREATE TABLE
    IF NOT EXISTS transaction_relations (
        id BIGSERIAL PRIMARY KEY,
        source_transaction_id BIGINT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
        related_transaction_id BIGINT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
        relation_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP,
        CONSTRAINT different_transactions CHECK (source_transaction_id != related_transaction_id)
    );

CREATE INDEX idx_transaction_relations_source ON transaction_relations (source_transaction_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transaction_relations_related ON transaction_relations (related_transaction_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transaction_relations_type ON transaction_relations (relation_type)
WHERE
    deleted_at IS NULL;

-- Create tags table
CREATE TABLE
    IF NOT EXISTS tags (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        color VARCHAR(7),
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP
    );

CREATE INDEX idx_tags_name ON tags (name)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_tags_deleted_at ON tags (deleted_at);

-- Create transaction_tags junction table
CREATE TABLE
    IF NOT EXISTS transaction_tags (
        id BIGSERIAL PRIMARY KEY,
        transaction_id BIGINT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
        tag_id BIGINT NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        CONSTRAINT unique_transaction_tag UNIQUE (transaction_id, tag_id)
    );

CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags (transaction_id);

CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags (tag_id);

-- Create transaction_templates table (for recurring transactions)
CREATE TABLE
    IF NOT EXISTS transaction_templates (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        amount BIGINT NOT NULL CHECK (amount > 0),
        account_id BIGINT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
        category_id BIGINT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
        destination_account_id BIGINT REFERENCES accounts (id) ON DELETE CASCADE,
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP
    );

CREATE INDEX idx_transaction_templates_account_id ON transaction_templates (account_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transaction_templates_category_id ON transaction_templates (category_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transaction_templates_deleted_at ON transaction_templates (deleted_at);

-- Create budget_templates table (for recurring budgets)
CREATE TABLE
    IF NOT EXISTS budget_templates (
        id BIGSERIAL PRIMARY KEY,
        account_id BIGINT REFERENCES accounts (id) ON DELETE CASCADE,
        category_id BIGINT REFERENCES categories (id) ON DELETE CASCADE,
        amount_limit BIGINT NOT NULL CHECK (amount_limit > 0),
        recurrence VARCHAR(20) NOT NULL CHECK (
            recurrence IN ('none', 'weekly', 'monthly', 'yearly')
        ),
        start_date DATE NOT NULL,
        end_date DATE,
        note TEXT,
        last_executed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP
    );

CREATE INDEX idx_budget_templates_account_id ON budget_templates (account_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budget_templates_category_id ON budget_templates (category_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budget_templates_recurrence ON budget_templates (recurrence)
WHERE
    deleted_at IS NULL
    AND recurrence != 'none';

CREATE INDEX idx_budget_templates_dates ON budget_templates (start_date, end_date)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budget_templates_due_for_execution ON budget_templates (recurrence, last_executed_at, deleted_at)
WHERE
    deleted_at IS NULL
    AND recurrence != 'none';

CREATE INDEX idx_budget_templates_deleted_at ON budget_templates (deleted_at);

-- Create budgets table
CREATE TABLE
    IF NOT EXISTS budgets (
        id BIGSERIAL PRIMARY KEY,
        template_id BIGINT REFERENCES budget_templates (id) ON DELETE SET NULL,
        account_id BIGINT REFERENCES accounts (id) ON DELETE CASCADE,
        category_id BIGINT REFERENCES categories (id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        amount_limit BIGINT NOT NULL CHECK (amount_limit > 0),
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP,
        CONSTRAINT valid_period CHECK (period_start <= period_end)
    );

CREATE INDEX idx_budgets_template_id ON budgets (template_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budgets_account_id ON budgets (account_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budgets_category_id ON budgets (category_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budgets_period ON budgets (period_start, period_end)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budgets_deleted_at ON budgets (deleted_at);