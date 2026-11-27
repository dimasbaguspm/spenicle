# Plan: simplification, fewer round-trips, and the eight open questions

A proposal, not a change. Every claim below is measured against the tree at `68effa5`
(`EXPLAIN QUERY PLAN` on the real schema, call counts from the handlers, `grep` for the
rest). Each section ends with what it costs and what it buys.

## 1. Naming: fewer words, no "voided"

| now | proposal | why |
| --- | --- | --- |
| `ledger_entries` / `ledger_postings` | `entries` / `postings` | the ledger is the only thing these tables hold |
| `voided_at`, `VoidEntry`, `reverses_entry_ref`, action `void` | `reversed_at`, `ReverseEntry`, `reversal_of_ref`, action `reverse` | "void" says nothing a reader can act on; the operation writes a reversal entry |
| `balance_state` | folded into `accounts` (see §2) | one row per account that says "dirty" is a second place to look |
| `running_balances` | `entry_balances` | it is one balance per entry, not a running total per account |
| `captures.batch_label` | `captures.group_label` | it groups rows; "batch" collides with `import_batches` |
| `POST /api/entries` body `{"void": true}` | `{"reverse": true}` | same reason as the column |
| `Module.Captures.Match` | fold into `Approve` with an `entry_ref` | two ways to resolve a capture, one of them rare |

Wire breakage: `void`/`voided_at`/`voided_entry_ref` are renamed. One release, documented in
`docs/v2-api.md` and the endpoint page, UAT snapshots regenerated — the same shape of change
as `client_id` → `idempotency_key`.

## 2. Balances: put them on the account, keep the ledger the truth

**Proposal: yes, but as a derived cache with a dirty flag, not as a second source of truth.**

- `accounts` gains `balance_minor INTEGER NOT NULL DEFAULT 0`, `balance_dirty INTEGER NOT NULL DEFAULT 1`,
  `balance_through_ref TEXT` (the last entry folded in). `balance_state` disappears.
- `running_balances` becomes `entry_balances (account_ref, entry_ref, occurred_on, balance_minor)`
  with `UNIQUE (account_ref, entry_ref)` and `INDEX (account_ref, occurred_on, entry_ref)` —
  that is what the register screen actually reads, and it stays O(entries).
- Every write to a posting marks `accounts.balance_dirty = 1` for the affected accounts inside
  the same transaction; a read of a dirty account rebuilds it from `postings` (the query that
  exists today in `store_ledger.go:542`) and clears the flag. The rebuild is already the code
  path; this only moves the flag next to the number it describes.
- Audit story: `accounts.balance_minor` is declared derived in `docs/v2-api.md`, and
  `docs/alignment.md` keeps the invariant "the sum of a posting's `base_amount_minor` equals
  the account balance" as a UAT DB snapshot.

Cost: one migration (no upgrade path, one schema file), ~120 lines of store change, 2 UAT
snapshots. Buys: one place to read an account balance instead of three
(`BalancesByAccount`, `running_balances`, `balance_state`), and `GET /api/accounts` stops
scanning all postings (`store_accounts.go:347` is a full scan today).

## 3. Limits from the environment

Today every knob is a constant in `internal/common/config/config.go`, and one of them is a
lie: `DefaultImportMaxBytes` (32 MiB) never binds because the multipart reader caps at
`maxFormBytes` (11 MiB, `handlers/captures.go:26`).

Proposal: eight new un-prefixed variables, read by `config.Load`, each with today's constant
as the default — `APP_MAX_BODY_BYTES`, `APP_ARTIFACT_MAX_BYTES`, `APP_IMPORT_MAX_BYTES`,
`APP_ARTIFACT_RETENTION`, `APP_EXPORT_RETENTION`, `APP_WORKER_INTERVAL`, `APP_HEALTH_TIMEOUT`,
`APP_IMPORT_COMMIT_CHUNK`. `maxFormBytes` becomes `ArtifactMaxBytes` and the dead 32 MiB knob
goes away. AGENTS.md's "eight variables, no ninth" sentence becomes "the secrets and the
addresses stay env; every limit has a default and an override".

Cost: `config.go` + one paragraph of AGENTS.md + `.env.example`. Buys: a self-hoster can
raise the upload cap without a rebuild, and the cap that is documented is the cap that binds.

## 4. Every currency

`internal/entity/currency.go` holds 15 hand-written codes; ISO 4217 has 180. A statement in
`BHD` or `CLP` is refused by the `currency` validator today.

Proposal: replace the map with the full ISO 4217 table (code + minor units, generated once
and committed as Go, no dependency), keep the symbol only where it exists, and test the
exponents that differ from 2 — `JPY` 0, `BHD`/`KWD`/`TND` 3, `CLF`/`UYW` 4 — plus the
`Money` rounding for each. The API already carries `minor_units` in `GET /api/meta`.

Cost: one generated file, one table test. Buys: no currency is refused because nobody typed
it in.

## 5. Indexes: drop five, add four, fix two

Measured, not guessed (`EXPLAIN QUERY PLAN` against `0001_init.sql`):

- **Dead** (no query searches the column): `ix_artifacts_sha256`, `ix_captures_batch_label`,
  `ix_mail_messages_observed`, `ix_mail_messages_capture_ref`, `ix_recurring_payee_ref`.
- **Broken as written**: `ux_import_rows_batch_ref` and `ux_import_upload_chunks_ref` are
  partial (`WHERE … <> ''`), and SQLite will not use a partial index for `batch_ref = ?`.
  Both list queries scan (`store_imports.go:233`, `:421`, `:849`, `:975`). Drop the
  predicate; the columns are `NOT NULL`, so the partiality buys nothing.
- **Missing**, each with the statement it serves: `ledger_postings (entry_ref, id)` for
  `store_ledger.go:118/592/668/855` (today it scans and builds a runtime automatic index),
  `ledger_entries (payee_ref)` for `:645/662`, `exports (status, started_at, id)` for
  `store_exports.go:221`, `artifacts (created_at, id) WHERE deleted_at IS NULL` for
  `store_artifacts.go:87`.
- **Not index-fixable**: the capture queue's `CASE` rank (`store_captures.go:140`) and the
  `substr(occurred_on, 1, 7)` grouping (`store_analytics.go:31`) always build a temp B-tree.
  If the queue gets long, materialise a `queue_rank` column; if the month roll-up gets slow,
  store `occurred_month` beside `occurred_on`.

## 6. Dates and times

`occurred_on` is stored as `YYYY-MM-DD` everywhere (`store_ledger.go:743`, `store_imports.go:324`).
That is correct for an accounting date and stays. What is inconsistent is the *filter*: the
audit and analytics bounds accept `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM` in `APP_TIMEZONE`
(`validating.Moment`), while `GET /api/entries` still takes `from`/`to` as a bare date
(`entries.go:75`).

Proposal: one parser for every date parameter (`Moment`/`MomentEnd`), so `from`/`to` mean the
same thing on every route, and `occurred_on` keeps the date. If sub-day ordering is ever
wanted, it is a new `occurred_at` timestamp beside it, not a change to `occurred_on` — the
calendar month grouping and the opening-balance date arithmetic both depend on the date.

## 7. A locked entry keeps its rate

Already true, and worth stating: `ledger_postings` stores `fx_rate`, `fx_rate_date` and
`fx_source` at insert (`store_ledger.go:168`), and a correction writes a new entry rather
than mutating the old one. Nothing re-reads a rate for an existing posting.

Proposal: make it a rule with a test — after `POST /api/entries`, refresh the ECB sheet and
assert the stored `fx_rate`/`fx_source` are unchanged (`fx_source` stays `ecb`/`cached` as of
the posting day, not of today), and say so in `GET_api_entries_ref.md`.

## 8. A request id the client can quote

There is no `Request-Id` header today; the trace id lives only in the span.

Proposal: both, because they answer different questions.
- `X-Request-Id: <trace_id>` on **every** response, stamped by `httpx.Observe` from
  `oteltrace.SpanFromContext(ctx).SpanContext().TraceID()`. One line, and it is the same id a
  log line carries, so "quote this id" resolves to the span.
- The error envelope gains `trace_id` **only for `5xx`**: a client that logs the body and
  drops the headers still has something to send. `4xx` stays as it is — those are the
  client's own mistake and the code already says which one.
- If a proxy already sends `X-Request-Id`, echo it as `X-Correlation-Id` rather than
  overwriting: the trace id must stay the id the collector knows.

## Caching: what to keep in memory, with a TTL and an invalidation

Measured per request today: `settings` is cached (1 h, in-process invalidate) and `api_tokens`
is one `SELECT` + at most one `UPDATE` (the touch). Everything else re-reads.

| data | TTL | invalidate on | why it is safe |
| --- | --- | --- | --- |
| `accounts`, `payees` | 60 s | any write in this process | only `http` writes them; the worker never does |
| live `categorization_rules` | 60 s | any write in this process | read on every suggestion (`service.go:49`) |
| `custom_queries` | 60 s | any write | rare writes, read per run |
| token verification | 10 s, keyed by digest | `Create`/`Revoke` | one `SELECT` per request today |
| `fx_rates` (already in memory) | until the day ends | a new day, or a manual refresh | a published day never changes |
| `connections` | 30 s | TTL only | the worker refreshes the token; 30 s of staleness is harmless |

Two rules that keep this from becoming a second database: a cache lives in the module that
owns the table (not in the handlers), and every cache has `Invalidate` called by that module's
write path — the settings service already does exactly this (`service.go:303`), so the shape
exists. The `http` and `worker` processes share the file but not the cache; the worker writes
none of the cached tables, so no cross-process signal is needed. If one is ever added, the
cheapest is `PRAGMA data_version` on a dedicated connection, not a new column.

## Fewer round-trips (the loops)

Ranked by queries saved per request:

1. `POST /api/imports` clash detection — `imports/service.go:590` probes up to 3 queries per
   row (`:617`, `:635`, `:662`). One statement with `IN (row keys)` plus one range query per
   amount window replaces it: ~3N → 2.
2. Commit — `pendingRows` + `postRow` cost 6-8 queries per row. Preload the distinct accounts,
   the payees and the rates once, then post rows with a single prepared insert per row: ~8N → N+3.
3. `suggestCategories` — `ResolveMany` re-reads `FindAccount` for every row that matches no
   rule (`categorization/service.go:132`, not memoised). Memoise it like `AccountByRef` already
   is: N → 1.
4. `displayNames` on every entry response — two page scans (`entries.go:290,299`). Cache both
   sets for 60 s and take them from the cache: 2 → 0.
5. `GET /api/meta` — four page scans per call; the client calls it on boot. Cache it with the
   accounts/payees/recurring entries.
6. `updateRunningBalances` — one read + one delete + one window insert + one upsert per
   account per entry (`store_ledger.go:214`). Fold into §2: one `UPDATE accounts SET balance…`
   and one `INSERT` per posting account.

## Status

- **§3 limits from the environment: shipped.** Eight `APP_*` overrides, each defaulting to the
  old constant; `maxFormBytes` is gone and the import cap is the documented one.
- **§4 every currency: shipped.** The table is the ISO 4217 set (170+ codes, exponents 0/2/3/4)
  instead of 15; `internal/entity/currency_test.go` holds it in place.
- **§5 indexes: shipped.** Five dead indexes dropped, four partial predicates that blocked an
  equality lookup removed, four new indexes added (`postings (entry_ref, id)`,
  `entries (payee_ref)`, `exports (status, started_at, id)`, live artifacts by `created_at`).
  `ix_recurring_payee_ref` stayed: it serves the recurring list's order.
- **§6 dates: shipped.** The shared list filter now reads `from`/`to` through the same
  `Moment`/`MomentEnd` parser as audit and analytics, in `APP_TIMEZONE`; `occurred_on` stays a date.
- **§8 request id: shipped.** `X-Request-Id` on every response (the trace id, or a minted one
  when tracing is off) and `trace_id` in the `5xx` body.
- §1, §2, §7, caching and the N+1 list: open.

## Order of work

1. §3 config, §4 currencies, §5 indexes — independent, small, no wire change.
2. §8 request id + §6 one date parser — one commit each, small.
3. §1 renames + §2 balance folding — the big one; one commit, UAT snapshots regenerated.
4. §Caching and the N+1 list — three commits (imports, categorization/display names, tokens).
5. §7 is a test and a doc line, not a change.
