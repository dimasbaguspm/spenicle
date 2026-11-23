-- 0005_exports: one asynchronous export job and the trail it leaves behind.
-- The blob lives in the artifact store under file_hash, so the row is metadata
-- and a swept job can drop its bytes without losing the job.
-- Keep comments free of semicolons: the splitter is naive on purpose.

CREATE TABLE exports (
  id             INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  client_id      TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL CHECK (status IN ('queued','running','ready','failed','expired')),
  format         TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  counts_json    TEXT,
  file_hash      TEXT,
  bytes          INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  started_at     TEXT,
  finished_at    TEXT,
  expires_at     TEXT,
  error_message  TEXT
);

CREATE INDEX ix_exports_status ON exports (status, id);

CREATE TABLE export_events (
  id           INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  export_id    INTEGER NOT NULL,
  kind         TEXT NOT NULL,
  payload_json TEXT,
  actor        TEXT NOT NULL,
  at           TEXT NOT NULL
);

CREATE INDEX ix_export_events_export ON export_events (export_id, id);
