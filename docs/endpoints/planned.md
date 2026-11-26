# Planned, not implemented

Every method and path in [`README.md`](./README.md) exists in the current tree. The items below are design decisions that are **not shipped**: do not treat them as live API behaviour. Product-level gaps also live in [`../product-deck/features/09-gaps-and-next.md`](../product-deck/features/09-gaps-and-next.md).

## Capture and intake

- **Completeness gate.** `statement_meta.row_count`, `closing_balance - opening_balance` and an "unlogged items" banner are not read or computed anywhere in Go. Import review shows parsed rows and clashes only.
- **Capture action `extracted`.** `PATCH /api/captures/{ref}` accepts only `approve`, `reject`, `retry` and `match`. Vendor output reaches a capture through `retry` polling its `job_ref`; there is no extraction-provider callback route.
- **Offline PWA.** The share target and IndexedDB outbox from the original design have no implementation; this repository serves no frontend assets. Clients call the documented HTTP routes directly.
- **Generic IMAP and more providers.** `internal/repository/mailbox/gmail` is the only shipped mailbox adapter, and Google the only OAuth connector. A generic IMAP adapter and a Calendar grant sharing one connection row remain planned.

## Ledger, reports and rates

- **Production integrity job.** There is no boot or post-import integrity job. `entity.CheckZeroSum` runs before insert and again inside the write transaction, and reversals are checked when created; that is the shipped invariant enforcement.
- **Four-way month close.** No lock, snapshot, `expected`/`tracked` diff or balancing adjustment exists. `GET /api/analytics/months` returns monthly totals derived from the ledger.
- **Dashboard derivations.** Safe-to-spend, 30/60/90-day forecast, month pace and top-payee tiles are planned. `GET /api/dashboard` returns only the fields it documents today.
- **Recurring detection and promotion.** The worker queues captures for rules that already exist; it does not infer rules from entries and exposes no HTTP detection route.
- **Scheduled FX refresh and HTML fallback.** `config.Start` warms the rate source; the worker has no FX stage. The ECB adapter makes one XML GET, with no HTML fallback.

## Credentials and cross-process work

- **Per-token rate limit.** Tokens are scoped and revocable, but no quota or rate-limit field is enforced. A token can never reach the root-only mux or mint another credential.
- **Trace propagation on jobs.** Export and import rows do not carry the caller's `traceparent`; the worker opens its own root span. The shared attribute vocabulary exists, but end-to-end cross-process traces are planned.
- **Import-row learning.** Categorization rules are explicit or suggested; accepted statement rows do not train a rule.

## Superseded designs

- `GET /api/months/{year_month}` was replaced by `GET /api/analytics/months`, `GET /api/analytics/categories` and saved analytics views.
- `PATCH /api/tokens/{id}` was replaced by `POST /api/tokens/{ref}/revoke`; the better-auth plugin idea died with the Go backend.
- The old `POST /internal/extractions/{id}/callback` is gone. The live provider callback is `GET /api/connections/google/callback` for Google OAuth; extraction still uses `action:"retry"`.
- `raw/<sha256>` was replaced by `artifacts/`, `imports/` and `exports/` under `./data`.
