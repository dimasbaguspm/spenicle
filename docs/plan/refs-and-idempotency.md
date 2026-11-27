# Plan: ref-keyed relations and server-minted idempotency keys

Two changes the owner asked for, both contract-level, so both need a decision before code.

## 1. Every relation by `ref`, not by `id`

### Where the tree stands

`0001_init.sql` has 24 integer foreign-key columns over 25 tables; 66 of 144 SQL fragments
touch one. Writes already resolve `ref → id` at the boundary
(`store_payees.go` `accountID`, the inline `(SELECT id FROM … WHERE ref = ?)` in
`store_artifacts.go` and `store_imports.go`), and reads project the `ref` back through a
`JOIN` constant (`store_ledger.go` `entryAccountSubquery`, `payeeSubquery`). What still
travels as an integer is: the entity structs (`PayeeID`, `AccountID`, `BatchID`,
`ReversesID`, `RecurringRuleID`, `EntityID`), the journal payloads
(`audit.go` `EntryPayee.PayeeID`, `EntryVoided.VoidedEntryID`), the cursor comparisons (14
sites), and the `ORDER BY … id` tiebreaks (18 sites, including every batch sweep).

### Options

| option | what it costs | what it buys |
| --- | --- | --- |
| **A. Keep `id` for joins, ban it above the store** (recommended) | ~15 files: entity structs carry refs only, journal payloads carry refs, handlers stop keying maps by id; no schema change, no snapshot churn | the API and every layer above SQLite speak refs only; joins stay indexed on an integer |
| **B. Text `ref` foreign keys in the schema** | rewrite of 25 tables in one migration (SQLite cannot alter a column: create/copy/drop/rename per table, `PRAGMA foreign_keys` off, `running_balances` and `balance_state` rebuilt), 66 SQL fragments, 14 cursors, 18 `ORDER BY`s, `uat/world_database.go` `clearOrder`, every DB snapshot | the database itself carries no integer relation; nothing above it can leak an id even by accident |
| **C. Both (B then A)** | B's cost, then A's | the strongest guarantee; the largest risk |

B's hidden costs, measured: 14 cursors and 18 `ORDER BY`s rely on `id` being *insertion
order*. A 32-hex ref is random, so paging (`before(…)`), the "newest first" listings and
the batch sweeps (`ORDER BY …, id ASC LIMIT 200`) all change behaviour, and the partial
unique indexes (`ux_entries_rule_due`, `ux_running_balances_entry`,
`UNIQUE (batch_id, row_index)`) have to be rebuilt against text keys. `uuid.New()` is
UUIDv7, so a new `created_seq`-style ordering key would come with it.

### Phases (option A, which is what the next change should do)

1. `internal/entity`: drop `ID` from every struct that already has `Ref`; keep `ID` in a
   separate write-only struct where the store needs it (`insertAccount`, …).
2. Store methods take and return refs only: `ImportRows(ctx, batchRef string)`,
   `RunningBalances(ctx, accountRef, entryRefs)`, `UpdateEntryPayee(ctx, ref, payeeRef)`,
   `BalancesByAccount` → `map[string]int64` keyed by ref.
3. Journal payloads carry `*_ref` (the typed `validate` tags already allow `ref`).
4. Handlers key their lookup maps by ref (`displayNames.payees`), which also removes the
   `Entry.PayeeID` read path.
5. Docs in the same commit (invariant 8), then `docs/alignment.md` gets a new row.

Acceptance: `grep -rn "\.ID\b" internal/entity internal/module cmd` finds no read of an
entity id above `internal/repository/sqlite`, and `make lint test uat` is green.

## 2. Server-minted idempotency keys

### Today

| route | field | required | consequence |
| --- | --- | --- | --- |
| `POST /api/entries` | `client_id` | no | a missing key means no dedupe; a replay posts a second entry |
| `POST /api/imports` | `client_id` | **yes** (`422`) | the client invents the key; it also names the `.part` file on disk |
| `POST /api/exports` | `client_id` | **yes** (`422`) | same; the key is echoed back so the client can poll |
| `POST /api/captures` | `client_id` | no | the dedupe key is already `sha256(kind, client_id, artifact_sha, raw_text)` |

The credential is available in the context today only as `actor.From.Ref`, which holds the
token ref for a token and is empty for the root password and in open mode
(`cmd/http/handler.go`). The worker has no credential at all.

### Proposed shape

A key the server mints: `<tokenref>_<random>`, where `tokenref` is the calling token's
32-hex ref and `random` is 16 hex characters from `crypto/rand`. In open mode and for the
root password the prefix is `root`. `client_id` becomes optional everywhere; a key that is
sent is accepted only if it matches `^(root|[0-9a-f]{32})_[0-9a-f]{16}$`, so a client can
echo back a key it received (that is what makes a *deliberate* replay possible) but cannot
invent an arbitrary string.

What this cannot do: two requests with no key are two different requests. Dedupe without
the client remembering anything needs the key to be derived from the request itself —
`sha256(credential, method, path, body)` — and that silently swallows a legitimate
duplicate (two identical coffees on the same day are one entry). So the rule is:
**the server mints, the client echoes when it wants idempotency**, and the response always
carries the key it used so the client never has to construct one.

### Phases

1. `internal/common/idem`: `Mint(ctx) (string, error)`, `Valid(string) bool`, tests.
2. Entries, imports, exports: `client_id` → optional, default to `Mint`, echo it in the
   response (`POST /api/entries` and `POST /api/imports` do not echo it today).
3. Replay with an unknown key is `409`/no-op as today; a key minted by another credential
   (prefix mismatch) is `403 forbidden`.
4. Docs: the three pages, `docs/v2-api.md`, the deck's F3/F6/F8 acceptance criteria.
5. The import `.part` file name becomes a hash of the key, so a key cannot reach the
   filesystem path.

Acceptance: `POST /api/imports` without `client_id` answers `201` with the batch, a second
identical request with the returned key answers `200` and writes one batch and one
`resumed` event.

## Status

- **§2, server-minted keys: shipped.** `internal/common/idem` mints `<credential-ref>_<16 hex>`
  (`root` for the instance password and open mode); entries, imports and exports mint when
  `client_id` is absent and echo it; a chunked import must send the key back after the first
  chunk, or it is `422 invalid_request`. A key the caller sends is still honoured as sent, so
  existing clients and their tests keep working. The UAT harness normalises a minted key to
  `<client_id>`, so the snapshots stay stable.
- **§1, relations by `ref`: the ledger and capture groups are converted.** Captures,
  `capture_payloads`, artifacts and mail messages now relate by `capture_ref` (and
  `resolved_entry_ref`), and their `*_id` columns are gone. Next: imports + exports, then
  `audit_log.entity_id`.
- **§1 (history), relations by `ref`: the ledger group is converted.** Accounts, payees,
  categorization rules, recurring rules, entries, postings, `balance_state`,
  `running_balances`, the journal payloads and the analytics roll-ups relate by `ref`, and
  the ledger tables no longer carry a `*_id` column at all. Next: captures + artifacts +
  mail, then imports + exports, then the retired columns those two still hold.
- **§1 (history), relations by `ref`: the schema is done, the queries are not.** There is one
  migration again (`0001_init.sql`), and it now carries a `<relation>_ref` column beside
  every retired `<relation>_id`, with the indexes on the ref. The store still writes the
  id, so the new columns are empty for a row created today. What is left is the convert
  step, one table group per commit: accounts + payees + categorization rules + recurring
  rules, then ledger entries + postings + running balances, then captures + artifacts +
  mail, then imports + exports. Each group: the store reads and writes `*_ref`, the entity
  struct drops the `*ID` field, the docs follow. Then the contract commit drops the retired
  columns and the plan section can go.
