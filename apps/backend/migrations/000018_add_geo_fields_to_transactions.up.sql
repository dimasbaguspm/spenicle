-- Add geolocation fields to transactions table
ALTER TABLE transactions
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Create indexes for geo queries
CREATE INDEX idx_transactions_latitude ON transactions (latitude)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_transactions_longitude ON transactions (longitude)
WHERE
    deleted_at IS NULL;