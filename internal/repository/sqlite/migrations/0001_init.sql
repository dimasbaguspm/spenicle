-- 0001_init: the whole schema, one migration, no history to migrate.
-- Every table carries a bigint id for the graph and a dashless UUID ref for the wire.
-- Keep comments free of semicolons: the splitter is naive on purpose.

CREATE TABLE settings (
  id  INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  k   TEXT NOT NULL UNIQUE,
  v   TEXT NOT NULL
);

CREATE TABLE api_tokens (
  id           INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  token_preview TEXT NOT NULL,
  token_hash   TEXT NOT NULL UNIQUE,
  scopes       TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at   TEXT
);

CREATE TABLE fx_rates (
  id         INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  base       TEXT NOT NULL DEFAULT 'EUR',
  quote      TEXT NOT NULL,
  on_date    TEXT NOT NULL,
  rate       TEXT NOT NULL,
  source     TEXT NOT NULL CHECK (source IN ('ecb','manual')),
  fetched_at TEXT NOT NULL,
  UNIQUE (base, quote, on_date)
);

CREATE TABLE accounts (
  id          INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('asset','liability','expense','income')),
  parent_id   INTEGER REFERENCES accounts(id),
  currency    TEXT NOT NULL,
  icon        TEXT,
  archived_at TEXT,
  created_at  TEXT NOT NULL,
  UNIQUE (name, kind)
);

CREATE TABLE payees (
  id                  INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL UNIQUE,
  default_account_id  INTEGER REFERENCES accounts(id),
  default_category_id INTEGER REFERENCES accounts(id),
  archived_at         TEXT,
  created_at          TEXT NOT NULL
);

CREATE TABLE recurring_rules (
  id                 INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  payee_id           INTEGER NOT NULL REFERENCES payees(id),
  account_id         INTEGER NOT NULL REFERENCES accounts(id),
  category_id        INTEGER REFERENCES accounts(id),
  amount_minor       INTEGER NOT NULL,
  currency           TEXT NOT NULL,
  cadence            TEXT NOT NULL CHECK (cadence IN ('daily','weekly','monthly','yearly')),
  interval_n         INTEGER NOT NULL DEFAULT 1,
  day_of_month       INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  business_day_shift TEXT NOT NULL DEFAULT 'none'
                     CHECK (business_day_shift IN ('none','next','prev')),
  next_due_on        TEXT NOT NULL,
  ends_on            TEXT,
  origin             TEXT NOT NULL CHECK (origin IN ('user','detected')),
  state              TEXT NOT NULL CHECK (state IN ('suggested','active','paused','ended')),
  last_posted_on     TEXT,
  created_at         TEXT NOT NULL
);

CREATE TABLE ledger_entries (
  id                INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  occurred_on       TEXT NOT NULL,
  payee_id          INTEGER REFERENCES payees(id),
  note              TEXT,
  currency          TEXT NOT NULL,
  source            TEXT NOT NULL CHECK (source IN
                    ('manual','share','email','statement','recurring','adjustment')),
  recurring_rule_id INTEGER REFERENCES recurring_rules(id),
  client_id         TEXT,
  reverses_entry_id INTEGER REFERENCES ledger_entries(id),
  voided_at         TEXT,
  created_at        TEXT NOT NULL
);

CREATE UNIQUE INDEX ux_entries_rule_due ON ledger_entries (recurring_rule_id, occurred_on)
  WHERE recurring_rule_id IS NOT NULL;

CREATE UNIQUE INDEX ux_entries_client ON ledger_entries (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX ix_entries_occurred ON ledger_entries (occurred_on);

CREATE TABLE ledger_postings (
  id                INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  entry_id          INTEGER NOT NULL REFERENCES ledger_entries(id) ON DELETE RESTRICT,
  account_id        INTEGER NOT NULL REFERENCES accounts(id),
  amount_minor      INTEGER NOT NULL,
  base_amount_minor INTEGER NOT NULL,
  fx_rate           TEXT NOT NULL DEFAULT '1',
  fx_rate_date      TEXT,
  fx_source         TEXT NOT NULL CHECK (fx_source IN ('ecb','cached','manual','identity'))
);

CREATE INDEX ix_postings_account ON ledger_postings (account_id, entry_id);
CREATE INDEX ix_postings_entry ON ledger_postings (entry_id);

CREATE TABLE captures (
  id                INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  kind              TEXT NOT NULL CHECK (kind IN
                    ('share','image','email','statement','recurring','manual')),
  status            TEXT NOT NULL CHECK (status IN
                    ('extracting','pending','duplicate','approved','rejected','failed')),
  client_id         TEXT,
  dedupe_key        TEXT NOT NULL UNIQUE,
  batch_id          TEXT,
  artifact_hash     TEXT,
  raw_text          TEXT,
  draft_json        TEXT,
  extraction_error  TEXT,
  extraction_job_ref TEXT,
  extraction_rail   TEXT,
  extraction_model  TEXT,
  resolved_entry_id INTEGER REFERENCES ledger_entries(id),
  resolution_note   TEXT,
  received_at       TEXT NOT NULL,
  resolved_at       TEXT
);

CREATE UNIQUE INDEX ux_captures_client ON captures (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX ix_captures_queue ON captures (status, received_at);
CREATE INDEX ix_captures_batch ON captures (batch_id);

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

CREATE TABLE import_batches (
  id           INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  client_id    TEXT NOT NULL UNIQUE,
  file_hash    TEXT NOT NULL,
  filename     TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('draft','committing','committed','rejected')),
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
  edited_at       TEXT,
  edited_fields   TEXT,
  UNIQUE (batch_id, row_index)
);

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

CREATE TABLE import_uploads (
  id              INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  client_id       TEXT NOT NULL UNIQUE,
  file_hash       TEXT,
  filename        TEXT NOT NULL,
  chunk_total     INTEGER NOT NULL,
  received_chunks INTEGER NOT NULL DEFAULT 0,
  received_bytes  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL CHECK (status IN ('open','complete','abandoned')),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  completed_at    TEXT
);

CREATE INDEX ix_import_uploads_status ON import_uploads (status, updated_at);

CREATE TABLE import_upload_chunks (
  id          INTEGER PRIMARY KEY,
  upload_id   INTEGER NOT NULL REFERENCES import_uploads(id),
  chunk_index INTEGER NOT NULL,
  bytes       INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  UNIQUE (upload_id, chunk_index)
);

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

CREATE TABLE custom_queries (
  id         INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL UNIQUE,
  namespace  TEXT NOT NULL CHECK (namespace IN ('months','categories')),
  chart      TEXT NOT NULL CHECK (chart IN ('bar','line','pie')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  entity_kind TEXT NOT NULL,
  entity_id   INTEGER,
  entity_ref  TEXT,
  action      TEXT NOT NULL,
  actor_kind  TEXT NOT NULL
              CHECK (actor_kind IN ('user','worker','system')),
  actor_ref   TEXT,
  from_json   TEXT,
  to_json     TEXT,
  at          TEXT NOT NULL
);

CREATE INDEX ix_audit_entity ON audit_log (entity_kind, entity_ref, id);
CREATE INDEX ix_audit_actor ON audit_log (actor_kind, at);
CREATE INDEX ix_audit_action ON audit_log (action, at);
