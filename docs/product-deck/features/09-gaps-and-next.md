# F9 — What we cannot ship yet, and what it would take

**Status** the honest list · **Client** every screen, read before promising anything
**Routes** — (this page adds none)

Two halves: **(A)** the gaps a client will hit today, with the workaround it must use
instead; **(B)** the feature cuts worth shipping next, each with its own RRR sketch and an
acceptance stub. Nothing in (B) is in the design doc yet, so each one starts with a
`docs/v2-design.md` change.

## What shipped since this list was written

The gaps closed on `main` are recorded once here, then dropped from the list in (A).
The table below records them once; section (A) lists only what is still open.

| gap | shipped as | commit |
| --- | --- | --- |
| 1 | `PATCH /api/captures/{ref}` takes `payee_ref`, resolves it through `PayeeSource.PayeeByRef`, and every capture answers `resolved_entry_ref`; an integer `payee_id` is now `400 invalid_json` | `feat: resolve a capture with refs, never integer ids` |
| 2 | `PATCH /api/entries/{ref}` takes `occurred_on`, `note` and `postings` and replaces the entry in one write (void + replacement, one transaction) | `feat: correct an entry's amount, date or note in one write` |
| 4 | `POST`/`PATCH /api/accounts` take `parent_ref` (same kind, no cycle, three levels) and `GET /api/analytics/categories?rollup=parent` sums a child into its root | `feat: nest a category under a parent and roll it up` |
| 6 | a duplicate `name`+`kind`, `payees.name` or `custom_queries.name` answers `409 duplicate` | `fix: answer 409 for a duplicate name` |
| 8 | `PATCH /api/captures/{ref}` accepts `{"action":"match","entry_ref":"…"}`, moving the capture to `duplicate` without touching the ledger | `feat: resolve a capture with refs, never integer ids` |
| G7 | `POST /api/exports` takes `from`/`to` (`YYYY-MM-DD`, both or neither), keeps them on the job as `exports.from_on`/`to_on`, drops every entry outside the window with its postings, and echoes the window on the listing, the job, the events and the download name; reading an export back in is still open, this ships the window only | `feat: render an export for a date window` |
| G10 | `PATCH /api/settings` refusing every body is the design, not a defect: base currency is locked once setup completes and timezone after first boot | [v2-design.md](../../v2-design.md) |
| G11 | verified: `config.SelectRail` builds SnapToJSON only; the OpenAI adapter is reserved for the future chat rail and `ai_assistance` is informational, never a capability gate | `docs: reserve the OpenAI adapter for the chat rail` |
| G4 | the ledger resolves the rate itself: a foreign entry posted without `fx_rate` takes the exact sheet day, else the nearest earlier business day, else a cross rate through EUR, and the posting is stamped with the rate, its `fx_source` (`ecb`/`cached`) and the day actually used; `GET /api/rates` carries the nearest earlier day and answers `source: "cached"`; an explicit `fx_rate` still wins | `feat: resolve a missing rate in the ledger and carry a running balance` |

| G12 | `module/export` now carries `categorization_rules` in JSON `data`, the zip CSV sheet and the summary `counts`; restored instances keep their rules | `feat: carry categorization rules in the export document` |
| G14 | `POST /api/captures` and `POST /api/imports` carry `suggested_category_ref` in their create responses, including `Unsorted` when nothing matches; omitted only on resolver failure | `feat: carry a category suggestion in capture and import responses` |
| G6 | `GET /api/entries` takes `with_balance=true` with one `account_ref` and answers `running_balance_minor` per row from one windowed query over `SUM(base_amount_minor)`; the page's postings load in one query instead of one per entry | `feat: resolve a missing rate in the ledger and carry a running balance` |
| G1 | `POST /api/setup` accepts up to 100 `{name, kind, opening_balance_minor}` accounts and atomically creates or reuses them, posts one balanced `adjustment` per nonzero balance against `Opening balance` equity, seals settings and writes the one-shot completion marker; currency-only setup stays valid | `feat: seed opening balances during setup` |
| G2 | `GET /api/meta` returns the shared settings flags, every account with its balance, every payee, every recurring rule and the ISO currency list; empty collections are `[]` and internal cursor pages prevent silent truncation | `feat: return the complete shell bootstrap from meta` |
| correctness | capture approval validates the entry first and inserts the entry, postings, capture resolution and both audit rows in one transaction; `failed` and `extracting` captures normalize through `pending`, while `rejected`/`duplicate` refuse | `fix: make capture approval atomic` |
| correctness | the route scope is the floor: handlers also require the scope for the data and side effect (`approve` → `entries:write`, payee learning → `payees:write`, `match` → `entries:read`, import `commit` → `entries:write`, `/api/meta` → four read scopes, export download → `entries:read`); `/api/setup` is root-only | `fix: enforce permissions for actual data and side effects` |
| G5 | statement CSV headers are mapped by name (`occurred_on`, `amount_minor`, `description`, optional `currency`) and an optional fourth column keeps a row's currency instead of forcing the base currency | `feat: support column mapping by header name in statement imports` |
| G3 | `POST /api/tokens` accepts optional `expires_at`; an expired credential is `401 unauthorized` and the listing exposes the expiry | `feat: add token expiry eligibility` |
| correctness | list cursors now follow each endpoint's actual sort order (default and every allowed sort), so a client that walks all pages of a bootstrap collection neither skips nor repeats rows | `fix: align list cursors with their sort order` |
| correctness | `/api/dashboard` takes one explicit `from`/`to` window for every tile; the server never derives a different period from the clock | `fix: give dashboard tiles one explicit window` |
| correctness | `/healthz` reports this process's UTC `started_at`; every boot appends a `system`/`start` audit row with service, build, schema version and start time, and the worker heartbeat is stamped only after the whole run finishes | `fix: make recovery and release evidence durable` |

Still open: **G3** (per-token rate limit), **G13** (import payee learning), the
attachment and IMAP halves of **G9**, and cross-process trace propagation for export and
import jobs. The other cross-cutting rows above are shipped. The next cuts in (B) that
are now done are marked there as well.

**G8 is excluded from the current backlog.** Polling is sufficient for the single-user
workload, while live updates need a durable cross-process change feed, replay cursor and
connection lifecycle that the design has not locked. Revisit it when concurrent clients
make polling a measured bottleneck; ETags and SSE are not promised until then.

G10 and G11 are verified, not open work. Extraction is SnapToJSON only; OpenAI is
reserved for a future chat endpoint, so `ai_assistance` must never gate a screen.

---

## A. Gaps in the API as shipped

| id | gap (verified in code) | what it costs the client | workaround today |
| --- | --- | --- | --- |
| G3 | tokens have optional `expires_at` and revocation, but no per-token rate limit and no un-revoke | a leaked shortcut token lives until it expires or someone revokes it; there is no grace-window undo | mint an expiry up front, revoke and re-issue; `last_used_at` is the only usage signal |
| G5 | ~~no per-row currency or column mapping~~ — headers are mapped by name and `currency` is an optional fourth column | closed | use the 3-column format in base currency, or add `currency` for a foreign row |
| G9 | attachments still are not captured, and only a Gmail adapter exists (`MailSourceIMAP` is a constant with no adapter) | a bank PDF or JPEG never becomes a capture | forward the text, or use the share sheet; attachments and IMAP are separate remaining cuts |
| G13 | an import commit does not learn a payee's default category — only a capture approval does | a CSV-first user gets no consistency for free | pick the category per row; `GET /api/categorization/suggest` still answers |
| G15 | ~~no ceiling~~ — `POST /api/categorization/rules` refuses beyond `CategorizationRuleLimit` (200) | closed | ceiling enforced at the handler |
| cross-cutting | export and import jobs do not carry the caller's `traceparent`; the worker starts a new root span | an end-to-end trace stops at the job row | join by job ref and time window in logs until propagation lands |

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

### N4 — Opening balances in the setup wizard *(shipped: G1)*

- **Client sees:** a first-run wizard that ends with real balances, not zeros.
- **Backend change:** `POST /api/setup` takes `accounts: [{name, kind,
  opening_balance_minor}]`, creates or reuses each account, and posts one `adjustment`
  against a dedicated `Opening balance` equity account inside the transaction that seals
  settings and writes the one-shot completion marker. A legacy ledger with entries is
  also locked.
- **RRR:** *Requirement* — the currency lock and opening entries are the same commit.
  *Risk* — a negative balance needs the right account kind; the wizard explains the sign
  convention. *Rollout* — currency-only setup stays backward compatible; accounts are
  capped at 100.
- **Acceptance:** setup with two accounts yields two balanced entries and a locked
  currency; a replay is `409 base_currency_locked`; a zero, duplicate, reserved or
  invalid account is `422 invalid_request`; any failure rolls back every setup write.

### N5 — Rates that resolve themselves *(shipped: G4)*

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

### N7 — Live updates instead of polling *(excluded for now: G8)*

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

### N8 — Credential hygiene *(open: G3 — per-token rate limit)*

`expires_at` shipped: it is optional on `POST /api/tokens`, the listing exposes it, and
an expired credential answers `401 unauthorized`. Un-revoke is deliberately **not**
part of this cut: revocation is final and a replacement token must be minted.

- **Client sees:** "this shortcut token expires in 90 days"; after that, a sign-in with
  the root credential and a new token.
- **Backend change:** a per-token rate limit in the identity middleware, keeping the
  instance-wide limits and the existing revocation path.
- **RRR:** *Requirement* — a rate-limited token answers `429` without touching the
  ledger, and the response says when to retry. *Risk* — a shortcut that silently expires
  looks like a broken app; the client must show the expiry date at mint time, and the
  listing must sort by it. *Rollout* — start with a generous ceiling and expose the
  remaining budget in token listings before tightening it.
- **Acceptance:** a token past `expires_at` is `401`; the listing shows `expires_at`;
  a token over its request budget is `429` while the root credential is unaffected.

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
