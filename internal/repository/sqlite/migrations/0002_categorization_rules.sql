-- 0002_categorization_rules: deterministic rules that suggest a category.
-- Keep comments free of semicolons: the splitter is naive on purpose.

CREATE TABLE categorization_rules (
  id          INTEGER PRIMARY KEY,
  ref         TEXT NOT NULL UNIQUE,
  pattern     TEXT NOT NULL,
  field       TEXT NOT NULL CHECK (field IN ('payee','note')),
  match_kind  TEXT NOT NULL CHECK (match_kind IN ('exact','contains','prefix')),
  account_id  INTEGER NOT NULL REFERENCES accounts(id),
  priority    INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT,
  created_at  TEXT NOT NULL
);

CREATE UNIQUE INDEX ux_rules_live ON categorization_rules (pattern, field, match_kind)
  WHERE archived_at IS NULL;

CREATE INDEX ix_rules_account ON categorization_rules (account_id);
