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