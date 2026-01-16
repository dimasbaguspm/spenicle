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