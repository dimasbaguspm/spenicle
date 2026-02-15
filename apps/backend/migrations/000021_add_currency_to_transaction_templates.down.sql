-- Rollback multi-currency support from transaction templates
DROP INDEX IF EXISTS idx_transaction_templates_currency_code;

ALTER TABLE transaction_templates
DROP COLUMN IF EXISTS currency_code;