-- Add destination_account_id column for transfer transactions
ALTER TABLE transactions
ADD COLUMN destination_account_id INT REFERENCES accounts (id);

-- Add comment for clarity
COMMENT ON COLUMN transactions.destination_account_id IS 'Destination account for transfer transactions (optional, only used when type is transfer)';