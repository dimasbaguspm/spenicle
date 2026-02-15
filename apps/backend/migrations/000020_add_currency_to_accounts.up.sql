-- Add currency fields to transactions table for multi-currency support
-- Accounts always store balance in base currency; conversion happens at transaction level
ALTER TABLE transactions
ADD COLUMN amount_foreign BIGINT,
ADD COLUMN currency_code VARCHAR(3),
ADD COLUMN exchange_rate NUMERIC(12, 6),
ADD COLUMN exchange_at TIMESTAMP;

-- Add check constraints
ALTER TABLE transactions
ADD CONSTRAINT check_currency_code 
CHECK (currency_code IS NULL OR currency_code ~ '^[A-Z]{3}$'),
ADD CONSTRAINT check_foreign_currency 
CHECK ((currency_code IS NOT NULL AND amount_foreign IS NOT NULL) OR (currency_code IS NULL AND amount_foreign IS NULL));

-- Create indexes for currency filtering
CREATE INDEX idx_transactions_currency ON transactions(currency_code) WHERE deleted_at IS NULL;
CREATE INDEX idx_transactions_currency_foreign_amount ON transactions(currency_code, amount_foreign) WHERE deleted_at IS NULL;

COMMENT ON COLUMN transactions.amount_foreign IS 'Foreign currency amount as input by user. NULL if transaction is in base currency.';
COMMENT ON COLUMN transactions.currency_code IS 'ISO 4217 currency code for foreign amount (e.g., USD, EUR). NULL if transaction is in base currency.';
COMMENT ON COLUMN transactions.exchange_rate IS 'Exchange rate used: foreign_currency → base_currency. NULL if no conversion. e.g., USD→IDR rate of 16500.50 stored as 16500.500000.';
COMMENT ON COLUMN transactions.exchange_at IS 'Timestamp when the currency conversion was applied. Null for base currency transactions.';

-- Add optional currency field to transaction_templates table
-- For now, this is prepared for future multi-currency template support but not actively used
ALTER TABLE transaction_templates
ADD COLUMN currency VARCHAR(3);

-- Add check constraint
ALTER TABLE transaction_templates
ADD CONSTRAINT check_template_currency_code 
CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$');

-- Create index for future filtering
CREATE INDEX idx_transaction_templates_currency ON transaction_templates(currency) WHERE deleted_at IS NULL;

COMMENT ON COLUMN transaction_templates.currency IS 'ISO 4217 currency code for template. Currently NULL (templates use account currency). Reserved for future multi-currency template support.';
