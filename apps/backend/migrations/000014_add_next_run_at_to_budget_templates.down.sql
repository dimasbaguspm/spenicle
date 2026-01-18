-- Remove next_run_at column from budget_templates table
DROP INDEX IF EXISTS idx_budget_templates_next_run_at;

ALTER TABLE budget_templates
DROP COLUMN IF EXISTS next_run_at;