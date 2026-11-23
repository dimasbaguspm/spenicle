# Spenicle v2 — Design

Status: decisions locked, not yet implemented. Operational docs: [`../README.md`](../README.md).
Schema and API: [`v2-api.md`](./v2-api.md). v1 is frozen on branch `v1`, tag `v1.0.0-locked`.

## Goal

A self-hosted expense tracker that is easy to run and forgives inconsistent logging.

v1 failed on three fronts: three containers to boot, five decisions per entry, and no
place to defer a decision. v2 fixes all three.

## Locked decisions

| decision | value |
| --- | --- |
| storage | SQLite, single binary, no Redis |
| deployment | one `docker run` / one compose file, port 8080 |
| auth | optional password for the browser; scoped API tokens for agents and scripts |
| sealing | `APP_SECRET` encrypts captures, artifacts and cookies; ledger stays readable plaintext |
| capture | PWA share target + offline IndexedDB outbox |
| review | single `captures` queue for every channel |
| ledger | double-entry: `ledger_entries` + `ledger_postings`, zero-sum per entry |
| categories | implemented as `accounts` rows with `kind IN ('expense','income')` |
| base currency | chosen in setup wizard, locked afterwards |
| currencies | embedded ISO 4217 list, not a table |
| FX rates | ECB daily EUR reference rates (XML feed), persisted and cached in memory |
| foreign amounts | a property of the transaction, not of the account |
| extraction | optional: needs a provider API key, otherwise captures stay raw for manual entry |
| recurring | rules generate `captures`; **always** require a tap |
| month close | none: no lock, no snapshot; the month report is derived from the ledger |
| history | fresh start; statement import can backfill via extraction when enabled |
| deletions | none, ever. Void and reject instead; `audit_log` records everything |

## Layout

```
cmd/http/             binary: main.go, bootstrap.go (composition root), routes.go
cmd/http/handlers/    one file per endpoint group; owns the route table
cmd/http/middlewares/ recovery, tracing, request logging
uat/                  Gherkin suite: uat.go (entry point), steps.go, world.go, features/
internal/common/      utilities with no business logic: config, clock, seal, otel, httpx
internal/constant/    every fixed value shared by more than one package
internal/entity/      shared structs and the invariants that must hold forever
internal/module/      business logic: ledger, bootstrap
internal/repository/  third-party comms: the contracts, plus sqlite and snaptojson
```

Two rules keep it pluggable:

1. Each directory has a root file that presents nothing but its interface —
   `repository.go`, `ledger.go`, `entity.go`, `uat.go`. A caller reads one file to
   learn what the package offers; a second adapter means one new implementation,
   not a new call site.
2. Dependencies point inward: `cmd` → `module` → `entity` + `repository` contracts.
   `entity` imports only the standard library and `constant`, so it can never
   create a cycle.

`cmd/http` is `package main`, so `uat` assembles the same graph by hand from
`repository/sqlite`, `module/bootstrap`, `module/ledger` and `handlers.New`.

### Contexts and spans

Every method that crosses a boundary takes `ctx context.Context` as its first
argument and opens one span named after the layer that owns the work:

| Layer | Span name |
|---|---|
| handlers | `Handler.Entries.Post`, `Handler.Health.Check` |
| modules | `Module.Ledger.Post`, `Module.Bootstrap.EnsureBaseline` |
| repositories | `Repository.Sqlite.InsertEntry`, `Repository.Snaptojson.Extract` |
| common | `Common.Config.Load`, `Common.Seal.Seal` |

Spans start from `internal/common/otel.StartSpan`, which returns the derived
context plus the end function — the span interface never leaks into a caller.
The process has exactly one `context.Background()`: the root in `cmd/http/main.go`
wrapped in `signal.NotifyContext`. Everything below derives from it, including
the shutdown timeout (`context.WithoutCancel`) so the last batch of spans still
flushes. Pure value code (`entity` validation, currency lookup, `clock`) takes no
context and opens no span: there is no boundary to trace.

## Non-goals for v2.0

Multi-user, tags, geo/map, TUI, envelope budgets, cross-currency account transfers,
multi-currency account ledgers, auto-posting recurring rules, bank API integrations.

## Schema (10 tables)

Canonical DDL with every column lives in [`v2-api.md`](./v2-api.md). Summary:

| table | purpose |
| --- | --- |
| `settings` | key/value config |
| `api_tokens` | hashed tokens with scopes, for agents and scripts |
| `fx_rates` | ECB EUR pairs per business day |
| `accounts` | assets, liabilities, and — as `expense`/`income` rows — categories |
| `payees` | counterparties, with capture defaults |
| `recurring_rules` | scheduled expectations, user-confirmed or detected |
| `ledger_entries` | what a human says happened |
| `ledger_postings` | where money moved, zero-sum per entry |
| `captures` | everything unconfirmed, the single review queue |
| — | (no month table: the report is derived from the ledger) |
| `audit_log` | append-only record of every state change |

Rates are exact decimal `TEXT`, money is signed `INTEGER` minor units, enums are `CHECK`
constraints. Currencies are **not** a table: the ISO 4217 list (code, minor units, symbol) is
embedded in the binary and validated at the API boundary.

Optional, only when a query gets slow: `balance_snapshots(account_id, on_date,
base_balance_minor)`, written when you review a month (12 rows/account/year).

## Invariants

1. `SUM(amount_minor) = 0` and `SUM(base_amount_minor) = 0` per `entry_id`.
   Enforced in the write transaction (SQLite cannot defer a cross-row CHECK),
   verified by an integrity job that runs on boot and after imports.
2. Money is always `(integer minor units, ISO code)`. Never float.
3. A posting's base amount is computed once, at write time, and never recomputed.
   This is why a past month's numbers cannot drift when rates change.
4. No `DELETE` on ledger, inbox, or rules. Void, reject, archive.
5. Every state change on those tables appends an `audit_log` row.

## Why postings exist

`ledger_entries` holds what a human says happened. `ledger_postings` holds where money
moved, one row per account touched, summing to zero.

Coffee, Rp 25.000 from BCA:

| entry | payee | occurred_on |
| --- | --- | --- |
| #812 | Kopi Kenangan | 2026-02-14 |

| posting | account | amount_minor |
| --- | --- | --- |
| 1 | Coffee (expense) | +25000 |
| 2 | BCA (asset) | −25000 |

Transfer, split bill, and reimbursement all fit the same shape with no new tables.

## Capture → review → ledger

Every channel lands in `captures`. Nothing touches the ledger until approved.

```mermaid
sequenceDiagram
    autonumber
    participant M as Mail poller
    participant ST as Local storage
    participant X as Extractor
    participant DB as SQLite
    participant U as User
    M->>DB: INSERT captures status extracting
    M->>ST: save raw MIME by sha256
    M->>X: POST body or image with schema v1
    X-->>M: fixed JSON plus per field confidence
    alt schema valid
        M->>DB: UPDATE captures SET draft_json, status pending
    else invalid or timeout
        M->>DB: UPDATE item status failed, raw kept
    end
    U->>DB: approve with fields, or reject with reason
    DB->>DB: append audit_log row
    U->>DB: approve writes entry plus postings
```

Lifecycle: `extracting → pending → (approved | rejected | duplicate | failed)`.
Nothing leaves the table. Rejected items keep their reason and can be reopened.

## Extraction contract

One schema, one validator, one ingest path. The extractor never writes to the ledger.

`kind: "single"` for an email or a photo, `kind: "statement"` for a file that yields
many rows. A statement produces N `captures` rows sharing `batch_id`, the artifact hash.

```json
{
  "schema_version": "v1",
  "kind": "statement",
  "statement_meta": {
    "account_hint": "BCA Tahapan",
    "period_start": "2026-01-01",
    "period_end": "2026-01-31",
    "opening_balance": "12000000.00",
    "closing_balance": "9540000.00",
    "row_count": 31
  },
  "transactions": [
    {
      "occurred_on": "2026-01-03",
      "amount": "-25000.00",
      "currency": "IDR",
      "merchant_raw": "KOPI KENANGAN",
      "reference_id": "TRX9921",
      "channel": "card",
      "card_last4": "4431",
      "confidence": { "amount": 0.99, "occurred_on": 0.95, "merchant": 0.8 }
    }
  ]
}
```

Rules:

- amounts are signed decimal **strings**, never floats
- unknown `schema_version` fails closed, it does not degrade to a partial parse
- `dedupe_key` per row: `sha256(account|occurred_on|amount|reference_id)` so a payment
  arriving by email *and* by statement becomes one item
- artifact paid for once: `sha256(file)` guards re-extraction charges
- long PDFs are chunked by page range; `chunk_index` / `chunk_of` record it
- privacy: with extraction disabled no artifact ever leaves the box; it lands as a
  `pending` capture and you type the fields

### Completeness gate

At ingest, compare the extractor's output against the statement's own header:

1. parsed rows vs `statement_meta.row_count`
2. sum of parsed amounts vs `closing_balance − opening_balance`

Mismatch shows a banner in review instead of failing silently. This is the same
number that later becomes the close diff's "unlogged spend" bucket.

## Recurring

`recurring_rules` never writes to the ledger. It writes a `captures` row:

```
rule.next_due_on <= today
  → INSERT captures(kind='recurring', dedupe_key=sha256(rule_id|due_on),
                   draft_json=<payee, amount, account, category>)
  → rule.next_due_on = next occurrence, last_posted_on = due date
```

Approving it creates the entry with `source='recurring'` and `recurring_rule_id`; the
unique index `(recurring_rule_id, occurred_on)` makes replays idempotent. Rejecting
skips that cycle and leaves a reason.

Because recurring bills enter the same queue, "review all untracked payments" covers
rent and Netflix as well as stray card taps. Expected spend for the month is computed
from the rules due, independent of approval, which is what makes the close diff
meaningful.

Detection writes `origin='detected', state='suggested'` and never posts. Heuristic:
same payee, ≥3 occurrences, amount within ±5%, spacing within ±3 days of the median
interval. Runs weekly.

`business_day_shift` handles a bill due Saturday but paid Monday.

## Month report (derived)

There is no close table and no lock. A month is a range of `occurred_on`; the report is computed
when you look at it.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant API as Month report handler
    participant DB as SQLite
    U->>API: GET /months/2025-09
    API->>DB: count pending captures in month
    API->>DB: SUM(base_amount_minor) per account
    API->>DB: statement closing vs ledger balance
    API->>API: split diff into unlogged, fx_movement, price_change, rounding
    API-->>U: expected, tracked, 4-way diff and an adjustment body
```

1. **Read-only.** The report writes nothing. If the unlogged bucket is non-zero it hands back an
   `adjustment_body` you may POST to `/api/entries`; that is your decision, not the system's.
2. **No month is ever locked.** Logging a September expense in November is the normal use case,
   so no request is refused for being "late". There is nothing to reopen either.
3. **Recomputation is cheap.** Four aggregates over `ledger_postings` for one month. That is the
   whole argument against caching it.
4. It stays correct for the same reason the ledger does: `base_amount_minor` is materialized per
   posting, so historical rates never change and a past month's numbers cannot drift.

## Sealing (`APP_SECRET`)

One env var and the sensitive half of the database is encrypted at rest. Not full-disk
encryption — a promise that a stolen `spenicle.db` is not a stolen mailbox.

| sealed | how |
| --- | --- |
| session cookie | HMAC-SHA256; rotating the secret invalidates sessions |
| `captures.raw_text`, `draft_json`, `resolution_note` | AES-256-GCM per row |
| `raw/<sha256>` receipts and statements | AES-256-GCM, key = HKDF(secret, file hash) |
| `api_tokens.token_hash` | HMAC-SHA256 instead of bare sha256 |
| **not** sealed, on purpose | ledger, postings, accounts, amounts |

The ledger stays plaintext so `sqlite3` still answers "what did I spend" when the secret is lost
or the app is broken. `settings.secret_fingerprint` is compared at boot; a mismatch refuses to
start with a clear error rather than returning garbage. `spenicle reseal` re-encrypts after a
secret rotation.

Whole-file encryption is out of scope: `modernc.org/sqlite` has no codec, and SQLCipher needs
cgo, which kills the static binary. LUKS the volume instead.

## FX

- Worker fetches `https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml` on boot
  when stale and daily after 16:30 CET. HTML page is fallback only.
- EUR-based only: `rate(A→B) = eurToB / eurToA`.
- No TARGET quote on weekends/holidays → carry the last known rate, labelled `cached`.
- Resolve order: in-memory map → `fx_rates` row for that date → manual prompt.
- Conversion: one expression, one rounding, `big.Rat`, never `float64`:
  `base_minor = round(native_minor × eurToBase / eurToNative × minorRatio)`.

## Offline PWA

1. Precached app shell, hashed assets, versioned service worker. Reading always works.
2. Writes queue in IndexedDB with client-generated UUIDv7 ids; the server upserts on
   that id, so retries never duplicate.
3. Optimistic UI with a pending badge until the server acknowledges.
4. The share target queues locally, so a capture at the till with no signal is not lost.
5. iOS Safari has no share target and no background sync. Fallback: a Shortcut that
   POSTs to the inbox, plus paste-into-inbox.

## Dashboard

No tiles table. Tiles are aggregate queries over postings; a cached tile that disagrees
with the ledger destroys trust faster than a slow query.

1. safe-to-spend: asset balances − recurring due to month end − avg variable × days left
2. 30/60/90 forecast: rules projected on a timeline, at today's rates
3. month pace: tracked vs expected, where expected is computed from the rules due
4. top payees: `GROUP BY payee_id`, this month vs last
5. unreviewed count: `captures WHERE status IN ('pending','extracting')`

## Build order

1. Skeleton: static Go binary, embedded React, SQLite migrations, compose. ~4h
2. Accounts, payees, quick add, postings, zero-sum integrity. ~1.5d
3. FX worker + rate resolver + base materialization. ~0.5d
4. Inbox, review UI, extraction client, schema v1 + completeness gate. ~1.5d
5. Recurring rules + generation into inbox + detection suggestions. ~1d
6. Dashboard tiles + derived month report. ~1d
7. Offline PWA hardening, share target, outbox replay. ~1d

~1.5 weeks of focused work to a usable v2.0.
