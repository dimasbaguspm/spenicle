-- Drop indexes
DROP INDEX IF EXISTS idx_budgets_dates;

DROP INDEX IF EXISTS idx_budgets_period;

DROP INDEX IF EXISTS idx_budgets_category_id;

DROP INDEX IF EXISTS idx_budgets_account_id;

DROP INDEX IF EXISTS idx_budgets_template_id;

DROP INDEX IF EXISTS idx_budget_templates_dates;

DROP INDEX IF EXISTS idx_budget_templates_recurrence;

DROP INDEX IF EXISTS idx_budget_templates_category_id;

DROP INDEX IF EXISTS idx_budget_templates_account_id;

-- Drop tables
DROP TABLE IF EXISTS budgets;

DROP TABLE IF EXISTS budget_templates;