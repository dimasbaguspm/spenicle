-- 0001_init: the whole schema, one migration, no history to migrate.
-- Every table carries a bigint id as its own row identity and a dashless UUID ref for
-- the wire. Relations carry both while the store moves over: the *_ref column is the
-- relation, the *_id column is retired and disappears when the last query stops using it.
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
  revoked_at   TEXT,
  expires_at   TEXT
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
  kind        TEXT NOT NULL CHECK (kind IN ('asset','liability','equity','expense','income')),
  parent_id   INTEGER REFERENCES accounts(id),  -- retired: parent_ref is the relation
  parent_ref  TEXT,
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
  default_account_id  INTEGER REFERENCES accounts(id),   -- retired: the refs are the relations
  default_category_id INTEGER REFERENCES accounts(id),   -- retired
  default_account_ref  TEXT,
  default_category_ref TEXT,
  archived_at         TEXT,
  created_at          TEXT NOT NULL
);
CREATE INDEX ix_accounts_name_prefix ON accounts (lower(name));
CREATE INDEX ix_payees_name_prefix ON payees (lower(name));

CREATE TABLE categorization_rules (
  id          INTEGER PRIMARY KEY,
  ref         TEXT NOT NULL UNIQUE,
  pattern     TEXT NOT NULL,
  field       TEXT NOT NULL CHECK (field IN ('payee','note')),
  match_kind  TEXT NOT NULL CHECK (match_kind IN ('exact','contains','prefix')),
  account_id  INTEGER NOT NULL REFERENCES accounts(id),  -- retired: account_ref is the relation
  account_ref TEXT NOT NULL DEFAULT '',
  priority    INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX ux_rules_live ON categorization_rules (pattern, field, match_kind)
  WHERE archived_at IS NULL;

CREATE INDEX ix_rules_account ON categorization_rules (account_id);

CREATE TABLE recurring_rules (
  id                 INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  payee_id           INTEGER NOT NULL REFERENCES payees(id),    -- retired
  account_id         INTEGER NOT NULL REFERENCES accounts(id),  -- retired
  category_id        INTEGER REFERENCES accounts(id),           -- retired
  payee_ref          TEXT NOT NULL DEFAULT '',
  account_ref        TEXT NOT NULL DEFAULT '',
  category_ref       TEXT,
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

CREATE INDEX ix_recurring_due ON recurring_rules (state, next_due_on, id);
CREATE INDEX ix_recurring_payee ON recurring_rules (payee_id, next_due_on, id);

CREATE TABLE ledger_entries (
  id                INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  occurred_on       TEXT NOT NULL,
  payee_id          INTEGER REFERENCES payees(id),  -- retired: payee_ref is the relation
  payee_ref         TEXT,
  note              TEXT,
  currency          TEXT NOT NULL,
  source            TEXT NOT NULL CHECK (source IN
                    ('manual','share','email','statement','recurring','adjustment')),
  recurring_rule_id INTEGER REFERENCES recurring_rules(id),  -- retired
  recurring_rule_ref TEXT,
  client_id         TEXT,
  reverses_entry_id INTEGER REFERENCES ledger_entries(id),  -- retired
  reverses_entry_ref TEXT,
  voided_at         TEXT,
  created_at        TEXT NOT NULL
);

CREATE UNIQUE INDEX ux_entries_rule_due ON ledger_entries (recurring_rule_id, occurred_on)
  WHERE recurring_rule_id IS NOT NULL;

CREATE UNIQUE INDEX ux_entries_client ON ledger_entries (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX ix_entries_occurred ON ledger_entries (occurred_on);
CREATE INDEX ix_entries_reversal ON ledger_entries (reverses_entry_id)
  WHERE reverses_entry_id IS NOT NULL;

CREATE TABLE ledger_postings (
  id                INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  entry_id          INTEGER NOT NULL REFERENCES ledger_entries(id) ON DELETE RESTRICT,  -- retired
  account_id        INTEGER NOT NULL REFERENCES accounts(id),                            -- retired
  entry_ref         TEXT NOT NULL DEFAULT '',
  account_ref       TEXT NOT NULL DEFAULT '',
  amount_minor      INTEGER NOT NULL,
  base_amount_minor INTEGER NOT NULL,
  fx_rate           TEXT NOT NULL DEFAULT '1',
  fx_rate_date      TEXT,
  fx_source         TEXT NOT NULL CHECK (fx_source IN ('ecb','cached','manual','identity'))
);

CREATE INDEX ix_postings_account ON ledger_postings (account_id, entry_id);
CREATE INDEX ix_postings_entry ON ledger_postings (entry_id);

CREATE TABLE balance_state (
  id         INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  account_id INTEGER NOT NULL UNIQUE REFERENCES accounts(id),  -- retired
  account_ref TEXT NOT NULL DEFAULT '',
  dirty      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE running_balances (
  id            INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  account_id    INTEGER NOT NULL REFERENCES accounts(id),           -- retired
  entry_id      INTEGER NOT NULL REFERENCES ledger_entries(id),     -- retired
  account_ref   TEXT NOT NULL DEFAULT '',
  entry_ref     TEXT NOT NULL DEFAULT '',
  occurred_on   TEXT NOT NULL,
  balance_minor INTEGER NOT NULL
);

CREATE UNIQUE INDEX ux_running_balances_entry ON running_balances (account_id, entry_id);
CREATE INDEX ix_running_balances_order ON running_balances (account_id, occurred_on, entry_id);

CREATE TABLE captures (
  id                 INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  kind               TEXT NOT NULL CHECK (kind IN
                     ('share','image','email','statement','recurring','manual')),
  status             TEXT NOT NULL CHECK (status IN
                     ('extracting','pending','duplicate','approved','rejected','failed')),
  client_id          TEXT,
  dedupe_key         TEXT NOT NULL UNIQUE,
  batch_id           TEXT,
  artifact_hash      TEXT,
  extraction_job_ref TEXT,
  extraction_rail    TEXT,
  extraction_model   TEXT,
  resolved_entry_id  INTEGER REFERENCES ledger_entries(id),  -- retired
  resolved_entry_ref TEXT,
  resolution_note    TEXT,
  received_at        TEXT NOT NULL,
  resolved_at        TEXT
);

CREATE UNIQUE INDEX ux_captures_client ON captures (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX ix_captures_queue ON captures (status, received_at);
CREATE INDEX ix_captures_batch ON captures (batch_id);

CREATE TABLE capture_payloads (
  id              INTEGER PRIMARY KEY,
  ref             TEXT NOT NULL UNIQUE,
  capture_id      INTEGER NOT NULL UNIQUE REFERENCES captures(id),  -- retired
  capture_ref     TEXT NOT NULL DEFAULT '',
  raw_text        TEXT,
  draft_json      TEXT,
  extraction_error TEXT
);

CREATE TABLE artifacts (
  id           INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  capture_id   INTEGER NOT NULL REFERENCES captures(id),  -- retired
  capture_ref  TEXT NOT NULL DEFAULT '',
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
  batch_id        INTEGER NOT NULL REFERENCES import_batches(id),  -- retired
  batch_ref       TEXT NOT NULL DEFAULT '',
  row_index       INTEGER NOT NULL,
  occurred_on     TEXT NOT NULL,
  amount_minor    INTEGER NOT NULL,
  currency        TEXT NOT NULL DEFAULT '',
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
  batch_id     INTEGER NOT NULL,  -- retired
  batch_ref    TEXT NOT NULL DEFAULT '',
  kind         TEXT NOT NULL,
  row_index    INTEGER,
  payload_json TEXT,
  actor        TEXT NOT NULL,
  at           TEXT NOT NULL
);

CREATE INDEX ix_import_events_batch ON import_events (batch_id, id);
CREATE INDEX ix_import_events_batch_ref ON import_events (batch_ref, id);
CREATE UNIQUE INDEX ux_import_rows_batch_ref ON import_rows (batch_ref, row_index)
  WHERE batch_ref <> '';

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
  id           INTEGER PRIMARY KEY,
  upload_id    INTEGER NOT NULL REFERENCES import_uploads(id),  -- retired
  upload_ref   TEXT NOT NULL DEFAULT '',
  chunk_index  INTEGER NOT NULL,
  bytes        INTEGER NOT NULL,
  chunk_sha256 TEXT NOT NULL,
  created_at   TEXT NOT NULL,
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
  from_on        TEXT,
  to_on          TEXT,
  created_at     TEXT NOT NULL,
  started_at     TEXT,
  finished_at    TEXT,
  expires_at     TEXT,
  error_message  TEXT
);

CREATE INDEX ix_exports_status ON exports (status, id);
CREATE INDEX ix_exports_expiry ON exports (status, expires_at);

CREATE TABLE export_events (
  id           INTEGER PRIMARY KEY,
  ref          TEXT NOT NULL UNIQUE,
  export_id    INTEGER NOT NULL,  -- retired
  export_ref   TEXT NOT NULL DEFAULT '',
  kind         TEXT NOT NULL,
  payload_json TEXT,
  actor        TEXT NOT NULL,
  at           TEXT NOT NULL
);

CREATE INDEX ix_export_events_export ON export_events (export_id, id);
CREATE INDEX ix_export_events_export_ref ON export_events (export_ref, id);
CREATE UNIQUE INDEX ux_import_upload_chunks_ref ON import_upload_chunks (upload_ref, chunk_index)
  WHERE upload_ref <> '';
CREATE UNIQUE INDEX ux_capture_payloads_capture_ref ON capture_payloads (capture_ref)
  WHERE capture_ref <> '';
CREATE INDEX ix_entries_reversal_ref ON ledger_entries (reverses_entry_ref)
  WHERE reverses_entry_ref IS NOT NULL;
CREATE INDEX ix_postings_account_ref ON ledger_postings (account_ref, entry_ref);
CREATE INDEX ix_rules_account_ref ON categorization_rules (account_ref);
CREATE UNIQUE INDEX ux_entries_rule_due_ref ON ledger_entries (recurring_rule_ref, occurred_on)
  WHERE recurring_rule_ref IS NOT NULL;
CREATE UNIQUE INDEX ux_running_balances_entry_ref ON running_balances (account_ref, entry_ref)
  WHERE account_ref <> '' AND entry_ref <> '';
CREATE INDEX ix_accounts_parent_ref ON accounts (parent_ref) WHERE parent_ref IS NOT NULL;
CREATE INDEX ix_recurring_payee_ref ON recurring_rules (payee_ref, next_due_on);

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
  entity_id   INTEGER,  -- retired: entity_ref is the only link
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

CREATE TABLE connections (
  id                INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  provider          TEXT NOT NULL UNIQUE CHECK (provider IN ('google')),
  account           TEXT NOT NULL,
  external_sub      TEXT,
  scopes            TEXT NOT NULL,
  refresh_token     TEXT NOT NULL,
  access_token      TEXT,
  access_expires_at TEXT,
  status            TEXT NOT NULL CHECK (status IN ('active','reauth_required')),
  last_refreshed_at TEXT,
  revoked_at        TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE mail_messages (
  id                INTEGER PRIMARY KEY,
  ref               TEXT NOT NULL UNIQUE,
  source            TEXT NOT NULL CHECK (source IN ('imap','gmail')),
  message_ref       TEXT NOT NULL,
  thread_ref        TEXT,
  message_id_header TEXT,
  provider_revision TEXT,
  received_at       TEXT NOT NULL,
  observed_at       TEXT NOT NULL,
  capture_id        INTEGER REFERENCES captures(id),  -- retired
  capture_ref       TEXT,
  status            TEXT NOT NULL CHECK (status IN ('captured','skipped','failed','gone')),
  skip_reason       TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  last_synced_at    TEXT,
  superseded_by     TEXT
);

CREATE UNIQUE INDEX ux_mail_messages_source ON mail_messages (source, message_ref);
CREATE INDEX ix_mail_messages_observed ON mail_messages (observed_at);
CREATE INDEX ix_mail_messages_capture ON mail_messages (capture_id);
CREATE INDEX ix_mail_messages_capture_ref ON mail_messages (capture_ref);
