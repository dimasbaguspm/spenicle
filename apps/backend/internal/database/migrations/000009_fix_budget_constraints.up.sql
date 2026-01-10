-- Fix budget constraints to allow same-day periods and larger amounts
-- Drop the old constraint that requires period_end > period_start
ALTER TABLE budgets
DROP CONSTRAINT IF EXISTS budget_period_valid;

-- Add new constraint that allows same-day periods (period_end >= period_start)
ALTER TABLE budgets ADD CONSTRAINT budget_period_valid CHECK (period_end >= period_start);

-- Change amount_limit from INTEGER to BIGINT to support very large values
ALTER TABLE budgets
ALTER COLUMN amount_limit TYPE BIGINT;

-- Also update budget_templates for consistency
ALTER TABLE budget_templates
DROP CONSTRAINT IF EXISTS budget_template_end_after_start;

ALTER TABLE budget_templates ADD CONSTRAINT budget_template_end_after_start CHECK (
    end_date IS NULL
    OR end_date >= start_date
);

ALTER TABLE budget_templates
ALTER COLUMN amount_limit TYPE BIGINT;