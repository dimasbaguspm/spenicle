-- Remove enhancements from transaction_templates
DROP INDEX IF EXISTS idx_transaction_templates_due_for_execution;

DROP INDEX IF EXISTS idx_transaction_templates_dates;

DROP INDEX IF EXISTS idx_transaction_templates_recurrence;

ALTER TABLE transaction_templates
DROP COLUMN installment_current,
DROP COLUMN installment_count,
DROP COLUMN end_date,
DROP COLUMN start_date,
DROP COLUMN recurrence,
DROP COLUMN last_executed_at;