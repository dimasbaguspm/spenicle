-- Create transaction_relations table for linking related transactions
CREATE TABLE
    transaction_relations (
        id SERIAL PRIMARY KEY,
        transaction_id INT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
        related_transaction_id INT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (transaction_id, related_transaction_id),
        CONSTRAINT no_self_relation CHECK (transaction_id != related_transaction_id)
    );

-- Add indexes for faster lookups
CREATE INDEX idx_transaction_relations_transaction_id ON transaction_relations (transaction_id);

CREATE INDEX idx_transaction_relations_related_transaction_id ON transaction_relations (related_transaction_id);

-- Add comment for clarity
COMMENT ON TABLE transaction_relations IS 'Stores relationships between transactions (e.g., A relates to B)';

COMMENT ON COLUMN transaction_relations.transaction_id IS 'The source transaction ID';

COMMENT ON COLUMN transaction_relations.related_transaction_id IS 'The related/linked transaction ID';