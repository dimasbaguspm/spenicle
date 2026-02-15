-- Rollback: Remove currency fields from transactions table
DROP INDEX IF EXISTS idx_transactions_currency;

DROP INDEX IF EXISTS idx_transactions_currency_foreign_amount;

ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS check_currency_code;

ALTER TABLE transactions
DROP CONSTRAINT IF EXISTS check_foreign_currency;

ALTER TABLE transactions
DROP COLUMN IF EXISTS amount_foreign;

ALTER TABLE transactions
DROP COLUMN IF EXISTS currency_code;

ALTER TABLE transactions
DROP COLUMN IF EXISTS exchange_rate;

ALTER TABLE transactions
DROP COLUMN IF EXISTS exchange_at;

-- Rollback: Remove currency field from transaction_templates table
DROP INDEX IF EXISTS idx_transaction_templates_currency;

ALTER TABLE transaction_templates
DROP CONSTRAINT IF EXISTS check_template_currency_code;

ALTER TABLE transaction_templates
DROP COLUMN IF EXISTS currency;