-- Create budget_template_relations table to link budgets with templates
CREATE TABLE
    IF NOT EXISTS budget_template_relations (
        id BIGSERIAL PRIMARY KEY,
        budget_id BIGINT NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
        template_id BIGINT NOT NULL REFERENCES budget_templates (id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        UNIQUE (budget_id) -- assuming one template per budget
    );

CREATE INDEX idx_budget_template_relations_budget_id ON budget_template_relations (budget_id);

CREATE INDEX idx_budget_template_relations_template_id ON budget_template_relations (template_id);