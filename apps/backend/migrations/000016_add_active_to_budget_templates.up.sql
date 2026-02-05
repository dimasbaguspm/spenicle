-- Add active column to budget_templates table
ALTER TABLE budget_templates ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Create index for filtering by active status
CREATE INDEX idx_budget_templates_active ON budget_templates(active) WHERE deleted_at IS NULL;
