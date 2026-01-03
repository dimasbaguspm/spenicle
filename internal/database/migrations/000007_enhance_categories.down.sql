-- Drop indexes first
DROP INDEX IF EXISTS idx_categories_archived_at;

DROP INDEX IF EXISTS idx_categories_display_order;

-- Remove the added columns
ALTER TABLE categories
DROP COLUMN IF EXISTS archived_at,
DROP COLUMN IF EXISTS display_order,
DROP COLUMN IF EXISTS icon_color,
DROP COLUMN IF EXISTS icon;