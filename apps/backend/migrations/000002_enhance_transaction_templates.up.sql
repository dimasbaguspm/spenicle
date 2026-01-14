-- Add last_executed_at tracking to transaction templates
ALTER TABLE transaction_templates
ADD COLUMN last_executed_at TIMESTAMP;

-- Add comprehensive fields for recurrence handling
ALTER TABLE transaction_templates
ADD COLUMN recurrence VARCHAR(20) DEFAULT 'none' CHECK (
    recurrence IN ('none', 'daily', 'weekly', 'monthly', 'yearly')
),
ADD COLUMN start_date DATE,
ADD COLUMN end_date DATE,
ADD COLUMN installment_count INTEGER CHECK (installment_count > 0),
ADD COLUMN installment_current INTEGER DEFAULT 0 CHECK (installment_current >= 0);

-- Add indexes for efficient querying
CREATE INDEX idx_transaction_templates_recurrence ON transaction_templates (recurrence)
WHERE
    deleted_at IS NULL
    AND recurrence != 'none';

CREATE INDEX idx_transaction_templates_dates ON transaction_templates (start_date, end_date)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transaction_templates_due_for_execution ON transaction_templates (recurrence, last_executed_at, deleted_at)
WHERE
    deleted_at IS NULL
    AND recurrence != 'none';