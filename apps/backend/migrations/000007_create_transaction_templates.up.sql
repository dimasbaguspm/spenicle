-- Create transaction_templates table (for recurring transactions)
CREATE TABLE
    IF NOT EXISTS transaction_templates (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        amount BIGINT NOT NULL CHECK (amount > 0),
        account_id BIGINT NOT NULL REFERENCES accounts (id),
        category_id BIGINT NOT NULL REFERENCES categories (id),
        destination_account_id BIGINT REFERENCES accounts (id),
        note TEXT,
        last_executed_at TIMESTAMP,
        recurrence VARCHAR(20) NOT NULL CHECK (
            recurrence IN ('none', 'weekly', 'monthly', 'yearly')
        ),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
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