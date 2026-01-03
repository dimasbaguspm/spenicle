-- Create transaction_templates table for recurring transactions
CREATE TABLE
    IF NOT EXISTS transaction_templates (
        id BIGSERIAL PRIMARY KEY,
        account_id BIGINT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
        category_id BIGINT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
        amount INTEGER NOT NULL CHECK (amount > 0),
        description TEXT,
        recurrence VARCHAR(20) NOT NULL CHECK (
            recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')
        ),
        start_date DATE NOT NULL,
        end_date DATE,
        installment_count INTEGER CHECK (installment_count > 0),
        installment_current INTEGER DEFAULT 0 CHECK (installment_current >= 0),
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP,
        CONSTRAINT check_installment_logic CHECK (
            (
                recurrence = 'none'
                AND installment_count IS NULL
            )
            OR (recurrence != 'none')
        ),
        CONSTRAINT check_installment_progress CHECK (
            installment_current <= COALESCE(installment_count, installment_current)
        )
    );

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_transaction_templates_account_id ON transaction_templates (account_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_templates_category_id ON transaction_templates (category_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_templates_recurrence ON transaction_templates (recurrence)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_templates_dates ON transaction_templates (start_date, end_date)
WHERE
    deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transaction_templates_deleted_at ON transaction_templates (deleted_at);