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
  cadence            TEXT NOT NULL CHECK (cadence IN ('weekly','monthly','yearly')),
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
  id           INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  entity_table TEXT NOT NULL,
  entity_id    INTEGER,
  action       TEXT NOT NULL,
  from_json    TEXT,
  to_json      TEXT,
  actor        TEXT NOT NULL DEFAULT 'user',
  at           TEXT NOT NULL
);

CREATE INDEX ix_audit_entity ON audit_log (entity_table, entity_id);
