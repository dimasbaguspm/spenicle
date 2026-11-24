# F9 — What we cannot ship yet, and what it would take

**Status** the honest list · **Client** every screen, read before promising anything
**Routes** — (this page adds none)

Two halves: **(A)** the gaps a client will hit today, with the workaround it must use
instead; **(B)** the feature cuts worth shipping next, each with its own RRR sketch and an
acceptance stub. Nothing in (B) is in the design doc yet, so each one starts with a
`docs/v2-design.md` change.

## What shipped since this list was written

Five gaps are **closed** on `main`: recorded once here, then dropped from the list in (A).
The table below records them once; section (A) lists only what is still open.

| gap | shipped as | commit |
| --- | --- | --- |
| 1 | `PATCH /api/captures/{ref}` takes `payee_ref`, resolves it through `PayeeSource.PayeeByRef`, and every capture answers `resolved_entry_ref`; an integer `payee_id` is now `400 invalid_json` | `feat: resolve a capture with refs, never integer ids` |
| 2 | `PATCH /api/entries/{ref}` takes `occurred_on`, `note` and `postings` and replaces the entry in one write (void + replacement, one transaction) | `feat: correct an entry's amount, date or note in one write` |
| 4 | `POST`/`PATCH /api/accounts` take `parent_ref` (same kind, no cycle, three levels) and `GET /api/analytics/categories?rollup=parent` sums a child into its root | `feat: nest a category under a parent and roll it up` |
| 6 | a duplicate `name`+`kind`, `payees.name` or `custom_queries.name` answers `409 duplicate` | `fix: answer 409 for a duplicate name` |
| 8 | `PATCH /api/captures/{ref}` accepts `{"action":"match","entry_ref":"…"}`, moving the capture to `duplicate` without touching the ledger | `feat: resolve a capture with refs, never integer ids` |

Still open: **G1** (opening balances in the one-shot setup), **G4** (the ledger resolving a
rate itself), and the cross-cutting rows from 5 onward. The next cuts in (B) that are now
done are marked there as well.

---
---

## A. Gaps in the API as shipped

| id | gap (verified in code) | what it costs the client | workaround today |
| --- | --- | --- | --- |
| G1 | `POST /api/setup` takes only `base_currency`: no accounts, no opening balances | a fresh instance shows every balance at zero and no way to seed reality | post one `adjustment` entry per account with its opening balance |
| G2 | `GET /api/meta` carries settings, accounts and currencies only — no payees, no rules, no `password_must_change` | the shell needs 2–3 extra calls on a cold start | `GET /api/payees`, `GET /api/recurring`, `GET /api/settings` after meta |
| G3 | tokens have no expiry, no per-token rate limit, no un-revoke | a leaked shortcut token lives until someone revokes it | revoke and re-issue; `last_used_at` is the only signal |
| G4 | the ledger never resolves a rate itself: `GET /api/rates` is exact-day, EUR-based, no cross rates, no nearest-business-day fallback | a foreign-currency entry needs the client to compute and send `fx_rate` | ask the user for the rate, or post in the base currency |
| G5 | import is one currency (the base) with no FX column and no column mapping | a USD statement cannot be imported with its own dates and rates | import as base-currency rows, fix by void + repost |
| G6 | no running balance on `GET /api/entries`; postings loaded per entry (N+1) | a "balance after this row" column needs client-side accumulation | accumulate client-side, or show the balance per account |
| G7 | no export date range, and no route reads an export back in | "give me just 2025" is not possible | export everything; the document is a complete backup by design |
| G8 | no ETag / `If-None-Match` anywhere; every wait is a poll | polling cost on the export and import screens | poll with backoff; stop on a terminal status |
| G9 | intake captures only `text/plain` bodies, attachments are not captured, and only a Gmail adapter exists (`MailSourceIMAP` is a constant with no adapter) | a bank attachment never becomes a capture | forward the text, or use the share sheet |
| G10 | `PATCH /api/settings` refuses every body (`base_currency`, `timezone` are not patchable) | no in-app settings beyond setup | settings are environment variables: `APP_TIMEZONE`, restart, or a fresh database |
| G11 | `ai_assistance` is still computed from `OPENAI_*` and returned by `GET /api/settings` and `GET /api/meta`, but `config.SelectRail` only builds the SnapToJSON rail and the OpenAI adapter is wired by tests only | a client that gates a screen on it offers a feature that does not exist | gate on `extraction_enabled`; treat `ai_assistance` as unknown-until-removed |

Doc debt left after the five closures (fix in the same MR as the next docs change):
`docs/endpoints/README.md` still has no rows for the four `/api/connections*` routes;
`GET_api_meta.md` still claims there is no payees route; `GET_api_exports_ref_download.md` says
export retention is "24h by default" (it is `ExportRetention` = 720h); `AGENTS.md` still
describes `OPENAI_*` as a "second extraction rail; used when SnapToJSON is unset", and
`docs/v2-api.md` still ties `ai_assistance` to a rail.

---

## B. The next feature cuts

Ordered by "unblocks a client screen per unit of backend risk". Each one is a vertical
slice with its own acceptance criteria, in the shape
[`CONTRIBUTING.md`](../../../CONTRIBUTING.md) asks for.

### N1 — Approve a capture with a payee ref *(shipped: `payee_ref` on approve)*

- **Client sees:** the review screen offers the merchant picker, and the entry an approval
  posts already carries that merchant — one tap, no follow-up call.
- **Backend change:** replace `PayeeID *int64` with `PayeeRef string` (`validate:"omitempty,ref"`)
  on `capturePatchRequest`, carry it on `captures.ApproveInput` (the module already has a
  `PayeeRef` field on `EnqueueInput`, so the shape exists), resolve it with
  `PayeeSource.PayeeByRef` in `Module.Captures.Approve`, and pass the id into
  `ledger.PostInput` — the same path `PATCH /api/entries` already takes. Struct, input,
  one resolve: no new query type, no schema change.
- **RRR:** *Requirement* — a client can set every field of the entry it approves, and no
  route accepts or returns an integer id. *Risk* — removing `payee_id` breaks a body no
  client can construct today (nothing returns an int id), and because the decoder refuses
  unknown fields a stale client gets a loud `400 invalid_json` instead of a silent drop;
  that is the behaviour we want, so ship it with the review screen. *Rollout* — one MR, no
  migration, no data change: the field is additive, and today's silent-ignore becomes an
  explicit refusal.
- **Acceptance:** `{"action":"approve","payee_ref":"<32 hex>"}` answers `201` and the
  returned `entry` carries `payee {ref, name}`; a body with `payee_id` is `400 invalid_json`;
  an unknown `payee_ref` is `404 not_found` and the capture stays `pending`; a snapshot of
  approve proves no integer id anywhere in the body.

### N2 — Match a capture to an existing entry *(shipped: `{"action":"match","entry_ref":"…"}`)*

- **Client sees:** "you already logged this" — approve becomes approve-or-link.
- **Backend change:** `{"action":"match","entry_ref":"…"}` in `Module.Captures`, moving the
  capture `pending → duplicate` with `resolved_entry_id` set (the status and the transition
  already exist; the action does not).
- **RRR:** *Requirement* — linking writes no ledger row and is reversible
  (`duplicate → pending`). *Risk* — a wrong link hides a real spend; the review screen must
  show the linked entry inline. *Rollout* — additive body action, no migration.
- **Acceptance:** match resolves the capture to `duplicate`; the ledger row count is
  unchanged; approving a matched capture is `409 capture_resolved`.

### N3 — A correction route for entries *(shipped: `PATCH` with `occurred_on`/`note`/`postings`)*

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

### N4 — Opening balances in the setup wizard *(open: G1)*

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

### N5 — Rates that resolve themselves *(open: G4)*

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

### N6 — Category hierarchy with roll-up *(shipped: `parent_ref` + `?rollup=parent`)*

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

### N7 — Live updates instead of polling *(open: G8)*

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

### N8 — Credential hygiene *(open: G3)*

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
