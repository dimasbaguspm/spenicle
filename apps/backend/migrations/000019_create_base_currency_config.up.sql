-- Create immutable base currency configuration table (single row only)
CREATE TABLE base_currency_config (
    id BIGSERIAL PRIMARY KEY,
    currency_code VARCHAR(3) NOT NULL UNIQUE,
    set_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (currency_code ~ '^[A-Z]{3}$')  -- Validate ISO 4217 format (3 uppercase letters)
);

-- Enforce single row constraint using unique index on constant value
CREATE UNIQUE INDEX idx_base_currency_config_single_row
    ON base_currency_config((1));

-- Insert default currency (IDR - Indonesia Rupiah)
INSERT INTO base_currency_config (currency_code) 
VALUES ('IDR');

COMMENT ON TABLE base_currency_config IS 'Immutable system-wide base currency configuration. Single row, write-once, set at app initialization.';
COMMENT ON COLUMN base_currency_config.currency_code IS 'ISO 4217 currency code (e.g., IDR, USD, EUR)';
COMMENT ON COLUMN base_currency_config.set_at IS 'Timestamp when base currency was configured (set at app initialization)';
