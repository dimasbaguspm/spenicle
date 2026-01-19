-- Create budgets table
CREATE TABLE
    IF NOT EXISTS budgets (
        id BIGSERIAL PRIMARY KEY,
        template_id BIGINT REFERENCES budget_templates (id),
        account_id BIGINT REFERENCES accounts (id),
        category_id BIGINT REFERENCES categories (id),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        amount_limit BIGINT NOT NULL CHECK (amount_limit > 0),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        period_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (
            period_type IN ('weekly', 'monthly', 'yearly', 'custom')
        ),
        name VARCHAR(100) NOT NULL DEFAULT '',
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

CREATE INDEX idx_budgets_status ON budgets (status)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budgets_period_type ON budgets (period_type)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_budgets_name ON budgets (name)
WHERE
    deleted_at IS NULL;

CREATE UNIQUE INDEX idx_budgets_unique_active ON budgets (account_id, category_id, period_type, status)
WHERE
    deleted_at IS NULL
    AND status = 'active';

CREATE INDEX idx_budgets_deleted_at ON budgets (deleted_at);