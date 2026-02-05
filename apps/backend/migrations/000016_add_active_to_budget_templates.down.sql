-- Remove active column from budget_templates table
ALTER TABLE budget_templates DROP COLUMN active;

-- Drop the index
DROP INDEX IF EXISTS idx_budget_templates_active;
