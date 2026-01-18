-- Add next_due_at column to transaction_templates table
ALTER TABLE transaction_templates
ADD COLUMN next_due_at TIMESTAMP;

-- Create index for sorting by next_due_at
CREATE INDEX idx_transaction_templates_next_due_at ON transaction_templates (next_due_at)
WHERE
    deleted_at IS NULL;

-- Update existing records to populate next_due_at
UPDATE transaction_templates
SET
    next_due_at = CASE
        WHEN recurrence = 'none' THEN NULL
        WHEN last_executed_at IS NULL THEN start_date
        WHEN recurrence = 'weekly' THEN last_executed_at + INTERVAL '7 days'
        WHEN recurrence = 'monthly' THEN last_executed_at + INTERVAL '1 month'
        WHEN recurrence = 'yearly' THEN last_executed_at + INTERVAL '1 year'
        ELSE NULL
    END
WHERE
    deleted_at IS NULL;