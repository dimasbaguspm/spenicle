-- Drop indexes first
DROP INDEX IF EXISTS idx_accounts_archived_at;

DROP INDEX IF EXISTS idx_accounts_display_order;

-- Remove the added columns
ALTER TABLE accounts
DROP COLUMN IF EXISTS archived_at,
DROP COLUMN IF EXISTS display_order,
DROP COLUMN IF EXISTS icon_color,
DROP COLUMN IF EXISTS icon;