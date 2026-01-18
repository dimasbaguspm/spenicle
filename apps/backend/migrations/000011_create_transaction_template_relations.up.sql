-- Create transaction_template_relations table to link transactions with templates
CREATE TABLE
    IF NOT EXISTS transaction_template_relations (
        id BIGSERIAL PRIMARY KEY,
        transaction_id BIGINT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
        template_id BIGINT NOT NULL REFERENCES transaction_templates (id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        UNIQUE (transaction_id) -- assuming one template per transaction
    );

CREATE INDEX idx_transaction_template_relations_transaction_id ON transaction_template_relations (transaction_id);

CREATE INDEX idx_transaction_template_relations_template_id ON transaction_template_relations (template_id);