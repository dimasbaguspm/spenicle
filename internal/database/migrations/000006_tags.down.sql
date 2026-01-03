-- Drop indexes
DROP INDEX IF EXISTS idx_transaction_tags_tag;

DROP INDEX IF EXISTS idx_transaction_tags_transaction;

-- Drop tables
DROP TABLE IF EXISTS transaction_tags;

DROP TABLE IF EXISTS tags;