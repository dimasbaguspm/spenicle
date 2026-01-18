-- Add next_run_at column to budget_templates table
ALTER TABLE budget_templates
ADD COLUMN next_run_at TIMESTAMP;

-- Create index for sorting by next_run_at
CREATE INDEX idx_budget_templates_next_run_at ON budget_templates (next_run_at)
WHERE
    deleted_at IS NULL;

-- Update existing records to populate next_run_at
UPDATE budget_templates
SET
    next_run_at = CASE
        WHEN recurrence = 'none' THEN NULL
        WHEN last_executed_at IS NULL THEN start_date
        WHEN recurrence = 'weekly' THEN last_executed_at + INTERVAL '7 days'
        WHEN recurrence = 'monthly' THEN last_executed_at + INTERVAL '1 month'
        WHEN recurrence = 'yearly' THEN last_executed_at + INTERVAL '1 year'
        ELSE NULL
    END