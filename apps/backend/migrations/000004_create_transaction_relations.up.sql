-- Create transaction_relations table (for transaction groups/splits)
CREATE TABLE
    IF NOT EXISTS transaction_relations (
        id BIGSERIAL PRIMARY KEY,
        source_transaction_id BIGINT NOT NULL REFERENCES transactions (id),
        related_transaction_id BIGINT NOT NULL REFERENCES transactions (id),
        relation_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP,
        CONSTRAINT different_transactions CHECK (source_transaction_id != related_transaction_id)
    );

CREATE INDEX idx_transaction_relations_source ON transaction_relations (source_transaction_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transaction_relations_related ON transaction_relations (related_transaction_id)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transaction_relations_type ON transaction_relations (relation_type)
WHERE
    deleted_at IS NULL;