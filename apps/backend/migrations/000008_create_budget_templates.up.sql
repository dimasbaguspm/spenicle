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