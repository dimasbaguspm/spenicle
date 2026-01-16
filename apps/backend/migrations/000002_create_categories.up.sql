-- Create categories table
CREATE TABLE
    IF NOT EXISTS categories (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
        note TEXT,
        icon VARCHAR(50),
        icon_color VARCHAR(7),
        display_order INTEGER NOT NULL DEFAULT 0,
        archived_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP,
        CONSTRAINT unique_category_name_per_type UNIQUE (name, type, deleted_at)
    );

CREATE INDEX idx_categories_type ON categories (type)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_categories_archived_at ON categories (archived_at)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_categories_deleted_at ON categories (deleted_at);