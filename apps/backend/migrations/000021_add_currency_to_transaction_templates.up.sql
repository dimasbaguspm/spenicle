-- Add multi-currency support to transaction templates
-- Templates store only currency code
-- Exchange rates and foreign amounts are calculated at transaction generation time
ALTER TABLE transaction_templates
ADD COLUMN currency_code VARCHAR(3);

-- Create index for filtering by currency
CREATE INDEX idx_transaction_templates_currency_code ON transaction_templates (currency_code)
WHERE
    deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN transaction_templates.currency_code IS 'ISO 4217 currency code for currency conversion (e.g., USD, EUR). Null if template uses base currency (IDR). MUTABLE - changing affects future generated transactions. Foreign amount is calculated at generation time, not stored.';