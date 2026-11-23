-- 0002_artifacts: the uploaded document behind a capture, content addressed.
-- Keep comments free of semicolons: the splitter is naive on purpose.

CREATE TABLE artifacts (
  id           INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  capture_id   INTEGER NOT NULL REFERENCES captures(id),
  sha256       TEXT NOT NULL,
  content_type TEXT NOT NULL,
  filename     TEXT NOT NULL,
  plain_bytes  INTEGER NOT NULL,
  stored_bytes INTEGER NOT NULL,
  created_at   TEXT NOT NULL,
  deleted_at   TEXT,
  UNIQUE (capture_id)
);

CREATE INDEX ix_artifacts_sha256 ON artifacts (sha256);
