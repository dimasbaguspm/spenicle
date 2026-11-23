-- 0003_imports: a drafted statement upload and the rows the user reviews.
-- Keep comments free of semicolons: the splitter is naive on purpose.

CREATE TABLE import_batches (
  id           INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  client_id    TEXT NOT NULL UNIQUE,
  file_hash    TEXT NOT NULL,
  filename     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('draft','committed','rejected')),
  rows_total   INTEGER NOT NULL,
  currency     TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  expires_at   TEXT NOT NULL,
  committed_at TEXT,
  rejected_at  TEXT
);

CREATE INDEX ix_import_batches_expiry ON import_batches (status, expires_at);

CREATE TABLE import_rows (
  id              INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  batch_id        INTEGER NOT NULL REFERENCES import_batches(id),
  row_index       INTEGER NOT NULL,
  occurred_on     TEXT NOT NULL,
  amount_minor    INTEGER NOT NULL,
  description     TEXT NOT NULL,
  account_ref     TEXT NOT NULL,
  category_ref    TEXT,
  payee_ref       TEXT,
  status          TEXT NOT NULL CHECK (status IN ('pending','accepted','skipped')),
  clash_kind      TEXT,
  clash_entry_ref TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (batch_id, row_index)
);
