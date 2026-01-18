-- Remove next_due_at column from transaction_templates table
DROP INDEX IF EXISTS idx_transaction_templates_next_due_at;

ALTER TABLE transaction_templates
DROP COLUMN IF EXISTS next_due_at;