-- 0004_import_events: what happened to a statement, in order, forever.
-- batch_id carries no foreign key on purpose: the worker deletes an expired
-- draft's batch row and the events it left behind must survive that delete.
-- Keep comments free of semicolons: the splitter is naive on purpose.

CREATE TABLE import_events (
  id           INTEGER PRIMARY KEY,
  ref          TEXT NOT NULL UNIQUE,
  batch_id     INTEGER NOT NULL,
  kind         TEXT NOT NULL,
  row_index    INTEGER,
  payload_json TEXT,
  actor        TEXT NOT NULL,
  at           TEXT NOT NULL
);

CREATE INDEX ix_import_events_batch ON import_events (batch_id, id);

ALTER TABLE import_rows ADD COLUMN edited_at TEXT;

ALTER TABLE import_rows ADD COLUMN edited_fields TEXT;
