-- Create transaction_tags junction table
CREATE TABLE
    IF NOT EXISTS transaction_tags (
        id BIGSERIAL PRIMARY KEY,
        transaction_id BIGINT NOT NULL REFERENCES transactions (id),
        tag_id BIGINT NOT NULL REFERENCES tags (id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        CONSTRAINT unique_transaction_tag UNIQUE (transaction_id, tag_id)
    );

CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags (transaction_id);

CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags (tag_id);