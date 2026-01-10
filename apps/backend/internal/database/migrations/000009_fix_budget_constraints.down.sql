-- Revert budget constraint changes
-- Revert to old constraint (period_end > period_start)
ALTER TABLE budgets
DROP CONSTRAINT IF EXISTS budget_period_valid;

ALTER TABLE budgets ADD CONSTRAINT budget_period_valid CHECK (period_end > period_start);

-- Revert amount_limit back to INTEGER
ALTER TABLE budgets
ALTER COLUMN amount_limit TYPE INTEGER;

-- Revert budget_templates
ALTER TABLE budget_templates
DROP CONSTRAINT IF EXISTS budget_template_end_after_start;

ALTER TABLE budget_templates ADD CONSTRAINT budget_template_end_after_start CHECK (
    end_date IS NULL
    OR end_date > start_date
);

ALTER TABLE budget_templates
ALTER COLUMN amount_limit TYPE INTEGER;