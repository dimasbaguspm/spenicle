-- Add icon, icon_color, display_order, and archived_at fields to accounts table
ALTER TABLE accounts
ADD COLUMN icon VARCHAR(255),
ADD COLUMN icon_color VARCHAR(7),
ADD COLUMN display_order INT NOT NULL DEFAULT 0,
ADD COLUMN archived_at TIMESTAMPTZ;

-- Create index for display_order for efficient sorting
CREATE INDEX idx_accounts_display_order ON accounts (display_order)
WHERE
    deleted_at IS NULL;

-- Create index for archived_at for efficient filtering
CREATE INDEX idx_accounts_archived_at ON accounts (archived_at)
WHERE
    deleted_at IS NULL;