-- Create tags table
CREATE TABLE
    IF NOT EXISTS tags (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        color VARCHAR(7),
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW (),
        deleted_at TIMESTAMP
    );

CREATE INDEX idx_tags_name ON tags (name)
WHERE
    deleted_at IS NULL;

CREATE INDEX idx_tags_deleted_at ON tags (deleted_at);