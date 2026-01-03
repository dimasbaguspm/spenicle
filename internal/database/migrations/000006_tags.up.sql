-- Create tags table
CREATE TABLE
    IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW ()
    );

-- Create transaction_tags junction table
CREATE TABLE
    IF NOT EXISTS transaction_tags (
        transaction_id INTEGER NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        PRIMARY KEY (transaction_id, tag_id)
    );

-- Create indexes for efficient queries
CREATE INDEX idx_transaction_tags_transaction ON transaction_tags (transaction_id);

CREATE INDEX idx_transaction_tags_tag ON transaction_tags (tag_id);