CREATE TABLE accounts_new (
  id          INTEGER PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('asset','liability','equity','expense','income')),
  parent_id   INTEGER REFERENCES accounts_new(id),
  currency    TEXT NOT NULL,
  icon        TEXT,
  archived_at TEXT,
  created_at  TEXT NOT NULL,
  UNIQUE (name, kind)
);

INSERT INTO accounts_new (id, ref, name, kind, parent_id, currency, icon, archived_at, created_at)
SELECT id, ref, name, kind, parent_id, currency, icon, archived_at, created_at FROM accounts;

DROP TABLE accounts;

ALTER TABLE accounts_new RENAME TO accounts;
