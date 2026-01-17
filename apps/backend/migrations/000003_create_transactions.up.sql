-- Create transactions table
CREATE TABLE
    IF NOT EXISTS transactions (
        id BIGSERIAL PRIMARY KEY,
        type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        date TIMESTAMP NOT NULL,
        amount BIGINT NOT NULL CHECK (amount > 0),
        account_id BIGINT NOT NULL REFERENCES accounts (id),
        category_id BIGINT NOT NULL REFERENCES categories (id),
        destination_account_id BIGINT REFERENCES accounts (id),
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