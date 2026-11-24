# F9 — What we cannot ship yet, and what it would take

**Status** the honest list · **Client** every screen, read before promising anything
**Routes** — (this page adds none)

Two halves: **(A)** the gaps a client will hit today, with the workaround it must use
instead; **(B)** the feature cuts worth shipping next, each with its own RRR sketch and an
acceptance stub. Nothing in (B) is in the design doc yet, so each one starts with a
`docs/v2-design.md` change.

---

## A. Gaps in the API as shipped

| # | gap (verified in code) | what it costs the client | workaround today |
| --- | --- | --- | --- |
| 1 | `PATCH /api/captures/{ref}` accepts `payee_id` — an **integer** — and no route ever returns an integer id | a client cannot set a payee while approving a capture; it is also a breach of "refs only" | approve without a payee, then `PATCH /api/entries/{ref}` with `{"payee_ref":"…"}` |
| 2 | `PATCH /api/entries/{ref}` accepts only `void` or `payee_ref` | no fix for a typo'd amount/date/note, no "edit note" | void + repost; two rows, both visible |
| 3 | `POST /api/setup` takes only `base_currency`; there is no opening balance | a fresh instance shows every balance at zero and no way to seed reality | post an `adjustment` entry per account with its opening balance |
| 4 | `accounts.parent_id` is never written; no route sets a parent, and `GET /api/analytics/categories` has no roll-up | category hierarchy cannot be built or reported | flat categories; `parent_ref` on `GET /api/accounts` filters a tree nobody can create |
| 5 | `GET /api/meta` carries settings, accounts and currencies only — no payees, no rules, and no `password_must_change` | the shell needs 2–3 extra calls on a cold start | `GET /api/payees`, `GET /api/recurring`, `GET /api/settings` after meta |
| 6 | a duplicate `accounts(name, kind)` or `custom_queries.name` answers `500 internal_error` | the user sees "internal error" for a name collision | pre-check client-side; treat `500` on create as "name taken" |
| 7 | tokens have no expiry, no per-token rate limit, no un-revoke | a leaked shortcut token lives until someone revokes it | revoke and re-issue; `last_used_at` is the only signal |
| 8 | the capture status `duplicate` is unreachable: no action sets it (`match` is unimplemented), and `extracted` (vendor push) does not exist either | the review screen cannot link a capture to an existing entry | approve with the same amount and let the ledger hold both; or reject |
| 9 | the ledger never resolves a rate itself: `GET /api/rates` is exact-day, EUR-based, no cross rates, no nearest-business-day fallback | a foreign-currency entry needs the client to compute and send `fx_rate` | ask the user for the rate, or post in the base currency |
| 10 | import is one currency (the base) with no FX column and no column mapping | a USD statement cannot be imported with its own dates-and-rates | import as base-currency rows, fix by void + repost |
| 11 | no running balance on `GET /api/entries`, postings loaded per entry (N+1) | a "balance after this row" column needs client-side accumulation | sum client-side from the account balance backwards, or show balance per account only |
| 12 | no export date range, no re-import of an export | "give me just 2025" is not possible | export everything; the JSON document is complete by design |
| 13 | no ETag / `If-None-Match` anywhere; every wait is a poll | polling cost on the export and import screens | poll with backoff; stop on a terminal status |
| 14 | intake captures only `text/plain` bodies; attachments are not captured; only a Gmail adapter exists (`MailSourceIMAP` is a constant with no adapter) | a bank attachment never becomes a capture | forward the text, or use the share sheet |
| 15 | `PATCH /api/settings` refuses every body (`base_currency`, `timezone` are not patchable) | no in-app settings beyond setup | settings are environment variables: `APP_TIMEZONE`, restart, or a fresh database |

Doc debt that this deck had to route around (fix in the same MR as the next docs change):
`docs/endpoints/README.md` has no rows for the four `/api/connections*` routes;
`GET_api_exports_ref_download.md` still says export retention is "24h by default" (it is
`ExportRetention` = 720h); `GET_api_meta.md` and `PATCH_api_captures_ref.md` still describe
an earlier shape (no payees route; `{id}` instead of `{ref}`).

---

## B. The next feature cuts

Ordered by "unblocks a client screen per unit of backend risk". Each one is a vertical
slice with its own acceptance criteria, in the shape
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) asks for.

### N1 — Approve a capture with a payee ref *(fixes gap 1)*

- **Client sees:** the review screen finally offers the merchant picker, and the entry it
  posts is complete in one tap.
- **Backend change:** rename `payee_id` to `payee_ref` on `capturePatchRequest`, resolve
  through `PayeeSource.PayeeByRef` in `Module.Captures.Approve` (the same path
  `PATCH /api/entries` uses). Small, isolated, and it removes the only integer id on the
  wire.
- **RRR:** *Requirement* — no route accepts or returns an integer id. *Risk* — a client
  already sending `payee_id` (there is none live, since no route returns one) breaks;
  accept `payee_ref` only and answer `422 invalid_request` for `payee_id`. *Rollout* — a
  single MR, additive for clients, breaking only for a body nobody can construct.
- **Acceptance:** `PATCH /api/captures/{ref}` with `payee_ref` posts an entry carrying that
  payee; a body with `payee_id` is `422`; a snapshot proves no integer id in any response.

### N2 — Match a capture to an existing entry *(fixes gap 8)*

- **Client sees:** "you already logged this" — approve becomes approve-or-link.
- **Backend change:** `{"action":"match","entry_ref":"…"}` in `Module.Captures`, moving the
  capture `pending → duplicate` with `resolved_entry_id` set (the status and the transition
  already exist; the action does not).
- **RRR:** *Requirement* — linking writes no ledger row and is reversible
  (`duplicate → pending`). *Risk* — a wrong link hides a real spend; the review screen must
  show the linked entry inline. *Rollout* — additive body action, no migration.
- **Acceptance:** match resolves the capture to `duplicate`; the ledger row count is
  unchanged; approving a matched capture is `409 capture_resolved`.

### N3 — A correction route for entries *(fixes gap 2)*

- **Client sees:** "edit this entry" with a required reason, showing both the original and
  the correction.
- **Backend change:** `POST /api/entries/{ref}/corrections` (or a body action on the
  existing PATCH) that voids the original and posts the corrected entry in **one**
  transaction, `source: "adjustment"`, `reverses_entry_id` set — a single call instead of
  the two the client does today.
- **RRR:** *Requirement* — the ledger still never deletes, and the pair is atomic so no
  read can see a ledger with the old entry and without the new one. *Risk* — a taxonomy of
  "why" that nobody uses; keep one free-text reason. *Rollout* — additive route; the
  two-call sequence keeps working.
- **Acceptance:** one call yields two entries and one `void` audit row; the account balance
  is unchanged when the correction equals the original; a replayed call is `409`.

### N4 — Opening balances in the setup wizard *(fixes gap 3)*

- **Client sees:** a first-run wizard that ends with real balances, not zeros.
- **Backend change:** extend `POST /api/setup` with `accounts: [{name, kind, opening_balance_minor}]`,
  each posted as an `adjustment` entry against a dedicated `Opening balance` equity account
  inside the same transaction that unlocks the currency. The `HasEntries` guard becomes
  "the setup has not run".
- **RRR:** *Requirement* — the base currency lock and the opening entries are the same
  commit, so a wizard can never leave a half-configured instance. *Risk* — users entering a
  negative cash balance (a card) need `liability` semantics; document the sign convention
  in the wizard copy. *Rollout* — `POST /api/setup` stays backward compatible: without
  `accounts`, nothing changes.
- **Acceptance:** setup with two accounts yields two balanced entries and a locked currency;
  calling setup twice is `409 base_currency_locked`; an unbalanced opening balance is `422
  postings_not_balanced`.

### N5 — Rates that resolve themselves *(fixes gap 9)*

- **Client sees:** "1 USD = 16 240 IDR (ECB, 13 Feb)" pre-filled, editable.
- **Backend change:** `Module.Ledger.Post` reads `fx_rates` (nearest earlier business day,
  then a cross rate through EUR) when `fx_rate` is absent, and stamps the resolved
  `fx_source`/`fx_rate_date`. `GET /api/rates` gains the same fallback.
- **RRR:** *Requirement* — resolution never guesses: a missing rate is `422 invalid_rate`,
  never an identity fallback. *Risk* — a silent stale rate makes a wrong base amount look
  authoritative, so the resolved date must be in the response and on screen. *Rollout* —
  additive (an explicit `fx_rate` still wins); the client can ship the pre-fill after the
  server.
- **Acceptance:** a USD entry without `fx_rate` posts with `fx_source: "ecb"` and a
  non-empty `fx_rate_date`; a date with no fetched sheet is `422 invalid_rate`; the same
  entry with an explicit rate keeps `fx_source: "manual"`.

### N6 — Category hierarchy with roll-up *(fixes gap 4)*

- **Client sees:** Food → Groceries/Coffee, with one parent number.
- **Backend change:** `parent_ref` on `POST/PATCH /api/accounts` with a cycle guard and a
  "same `kind`" rule, plus a `CategoryTotals` roll-up (`?rollup=parent`).
- **RRR:** *Requirement* — a parent may not be its own descendant, and a parent's roll-up
  equals the sum of its children plus its own postings. *Risk* — reparenting an account
  with history rewrites every report retroactively; make it a flag (`archived` a child,
  create a new one) rather than a free edit. *Rollout* — server first (`parent_ref`
  ignored by old clients), UI second.
- **Acceptance:** a cycle is `422 invalid_request`; `categories?rollup=parent` sums
  children; `categories` without the flag is unchanged.

### N7 — Live updates instead of polling *(fixes gap 13)*

- **Client sees:** the export flips to ready, the queue badge moves — without a refresh.
- **Backend change:** `GET /api/events` as Server-Sent Events over the same credential,
  emitting `capture.queued`, `export.ready`, `import.committed` from one in-process hub.
  No new infrastructure: `http` already owns the write path, and the worker publishes
  through the same SQLite file only via a small change-poll with a version row.
- **RRR:** *Requirement* — SSE carries refs and kinds only, never payloads, and it is
  optional: every screen must still work by polling. *Risk* — a second long-lived
  connection per client on a single-instance server; cap connections per credential.
  *Rollout* — additive route behind its own scope (`events:read`), shipped to one screen
  first (the export panel).
- **Acceptance:** a queued export emits `export.ready` after the worker run; a client that
  never opens the stream behaves exactly as today; a revoked token's stream closes.

### N8 — Credential hygiene *(fixes gap 7)*

- **Client sees:** "this shortcut token expires in 90 days", and a revoke that can be
  reversed within the grace window.
- **Backend change:** `expires_at` on `POST /api/tokens`, enforced in the identity
  middleware (`401 unauthorized` past it), plus `PATCH /api/tokens/{ref}` to un-revoke
  inside a grace window; per-token rate limit in the same middleware.
- **RRR:** *Requirement* — an expired token answers `401`, never `403`, and expiry is
  visible in the listing before it happens. *Risk* — a shortcut that silently expires looks
  like a broken app; the client must show the expiry date at mint time, and the listing
  must sort by it. *Rollout* — `expires_at` optional; tokens minted without it never
  expire, so nothing breaks.
- **Acceptance:** a token past `expires_at` is `401`; the listing filters
  `?expired=true`; un-revoke inside the window restores access and leaves two journal rows.

---

## C. How a client should treat this page

1. **Never promise a route this page lists as missing.** The workaround column is the
   contract until the feature ships.
2. **Never derive a number the API owns.** If a figure is not in a payload, it is not
   promised yet — do not compute spend client-side and present it as the app's answer.
3. **Treat additive change as normal.** There is no version prefix: new fields and new
   enum values will appear. Parse permissively, and pin `schema_version` from
   `GET /healthz` for anything that reads the export document.
4. **Check `docs/v2-design.md` before building on a cut in (B).** Until the design doc
   changes, these are proposals, not contracts.
