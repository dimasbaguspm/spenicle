-- Create budget_templates table for recurring budget configurations
CREATE TABLE
    budget_templates (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts (id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories (id) ON DELETE CASCADE,
        amount_limit INTEGER NOT NULL CHECK (amount_limit > 0),
        recurrence VARCHAR(10) NOT NULL DEFAULT 'none' CHECK (
            recurrence IN ('none', 'weekly', 'monthly', 'yearly')
        ),
        start_date DATE NOT NULL,
        end_date DATE,
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        CONSTRAINT budget_template_at_least_one CHECK (
            account_id IS NOT NULL
            OR category_id IS NOT NULL
        ),
        CONSTRAINT budget_template_end_after_start CHECK (
            end_date IS NULL
            OR end_date >= start_date
        )
    );

-- Create budgets table for actual budget periods
CREATE TABLE
    budgets (
        id SERIAL PRIMARY KEY,
        template_id INTEGER REFERENCES budget_templates (id) ON DELETE SET NULL,
        account_id INTEGER REFERENCES accounts (id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories (id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        amount_limit INTEGER NOT NULL CHECK (amount_limit > 0),
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        CONSTRAINT budget_at_least_one CHECK (
            account_id IS NOT NULL
            OR category_id IS NOT NULL
        ),
        CONSTRAINT budget_period_valid CHECK (period_end > period_start)
    );

-- Create indexes for performance
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

CREATE INDEX idx_budgets_dates ON budgets (period_start DESC, period_end DESC)
WHERE
    deleted_at IS NULL;