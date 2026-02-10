-- Remove geolocation fields from transactions table
ALTER TABLE transactions
DROP COLUMN IF EXISTS longitude,
DROP COLUMN IF EXISTS latitude;