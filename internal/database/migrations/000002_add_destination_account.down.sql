-- Remove destination_account_id column
ALTER TABLE transactions
DROP COLUMN IF EXISTS destination_account_id;