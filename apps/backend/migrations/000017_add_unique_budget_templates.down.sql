-- Remove unique indexes for budget templates
DROP INDEX IF EXISTS idx_budget_templates_unique_account;
DROP INDEX IF EXISTS idx_budget_templates_unique_category;
