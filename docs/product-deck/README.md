# The product deck

What a person actually gets from Spenicle, written from the **client app's** point of
view and backed by the backend that ships today. One page per feature: the journeys
that need several calls, the backend path end to end, the RRR block
(**R**equirements, **R**isks, **R**ollout) and the acceptance criteria a test can
prove.

The backend is what exists in this repository. The client (PWA, iOS Shortcut, an
agent, `curl`) is a separate codebase: everything below is the contract that client
codes against, so a page never says "we will decide later" — it says what the server
does today, what it refuses, and where the edge is.

- Route-by-route reference: [`../endpoints/README.md`](../endpoints/README.md)
- Data model and wire conventions: [`../v2-api.md`](../v2-api.md)
- The locked design (these pages may not contradict it): [`../v2-design.md`](../v2-design.md)

## What the product is

A self-hosted, single-user expense tracker. One binary, one SQLite file, one
container. The promise is not bookkeeping purity, it is **capture separation**:
logging a coffee costs two seconds, and nothing is organized behind your back.
Deleting is never offered — you void. Capture is never the ledger — you approve.

Three surfaces, one API:

| surface | who | what it does |
| --- | --- | --- |
| the shell | the person, at home | dashboard, ledger, review queue, import, export, settings |
| the shortcut | the person, standing at a till | `POST /api/captures` with a photo or pasted text, nothing else |
| the agent | a script, a cron job, a mail poller | scoped token, reads spend, dumps receipts, never edits the ledger |

## The feature map

| page | feature | client sees | backend areas |
| --- | --- | --- | --- |
| [F1](./01-access-and-bootstrap.md) | open the instance, then keep it closed | first-run wizard, forced password change, token screen, audit |
| [F2](./02-capture-inbox.md) | capture now, decide later | share sheet, review queue, receipt viewer, mail intake |
| [F3](./03-ledger.md) | the ledger is the truth | entry form, ledger list, entry detail, void |
| [F4](./04-accounts-and-payees.md) | accounts, categories, merchants | chart of accounts, payee picker |
| [F5](./05-recurring.md) | predictable money arrives on its own | recurring rules, queue items the worker queued |
| [F6](./06-statement-import.md) | a bank CSV becomes a reviewable draft | import wizard, row editor, commit |
| [F7](./07-insights.md) | how did the month go | dashboard tiles, month bars, category pie, saved views |
| [F8](./08-export.md) | the door out | export job, progress polling, download |
| [F9](./09-gaps-and-next.md) | what we cannot ship yet | — (the honest list) |

Status of every feature page here is **live**: the route exists, the UAT suite covers
it, `make test` and `make lint` are green. F9 lists what is *not* live and what it
would take.

## The client contract (applies to every page)

Read this once; the feature pages only mention the deviations.

### One credential header

```
Authorization: Bearer <credential>
```

There is no cookie, no session, no exchange route. The credential is either **the
instance password** (the root credential, answers every route) or **an API token**
(answers only the routes whose scope it carries). A missing or wrong credential is
`401 unauthorized`; a token reaching a route outside its scopes is `403 forbidden`
and the message names the route and the scope it wants.

**Open mode:** while no password is set, every request is treated as root. A fresh
container prints its generated password once at boot, so open mode is the first
minutes of a development instance, not a deployment mode. A client must treat
`GET /api/settings` → `password_must_change: true` as "show the change-password
screen before anything else".

### One error envelope

```json
{"error":{"code":"postings_not_balanced","message":"postings do not sum to zero"}}
```

`code` is the branchable part, `message` is for a human. A `5xx` always carries the
code `internal_error` and the literal message `internal error`: the cause is in the
structured log, joined to the request by `trace_id`. Codes a client must handle:

| status | codes |
| --- | --- |
| `400` | `invalid_json` (unknown or malformed field) |
| `401` | `unauthorized` (no/mismatched credential), `invalid_password`, `invalid_state` (OAuth callback) |
| `403` | `forbidden` (token without the scope, or a root-only route) |
| `404` | `not_found` |
| `409` | `capture_resolved`, `invalid_state`, `base_currency_locked`, `secret_mismatch`, `import_conflict`, `import_closed`, `import_committing`, `export_conflict`, `export_not_ready`, `export_failed`, `intake_disabled`, `reauth_required` |
| `410` | `gone` (an artifact or export blob the worker reclaimed) |
| `422` | `invalid_request`, `unknown_currency`, `unknown_reference`, `postings_not_balanced`, `invalid_postings`, `invalid_rate`, `empty_setup`, `empty_patch`, `unsupported_patch`, `weak_password`, `unknown_capture_kind` |
| `503` | `degraded` (`GET /healthz` only) |

The promotion rule matters to a client: a field failure inside `422 invalid_request`
is re-coded to the domain code when the table knows it, so `unknown_currency` and
`invalid_postings` arrive even though validation happened per field.

### Money, refs, time

- **Money is a minor-unit string.** `"25000"` next to `"currency":"IDR"`. Never a
  float, never a formatted string. A client formats; the API never does.
- **Refs only.** Every row has a 32-lowercase-hex `ref`; that is the only identifier
  the API speaks. Requests send `account_ref`, `payee_ref`, `category_ref`, `entry_ref`,
  responses carry `ref` (and `resolved_entry_ref`). No route accepts or returns an
  integer id: an unknown field such as `payee_id` is `400 invalid_json`.
- **Dates** are `YYYY-MM-DD`, timestamps RFC3339 in UTC. Every calendar decision
  ("today", "due", "this month") is made in `APP_TIMEZONE`, pinned at the first boot
  and reported by `GET /api/settings` and `GET /healthz`.
- **Nothing is deleted.** `archived_at`, `voided_at`, `revoked_at`, `status` are the
  vocabulary. A client that offers a delete button is lying to the user.

### Lists, paging, idempotency

Every list route answers the same envelope:

```json
{"<collection>": [], "meta": {"limit": 50, "has_more": false, "next_cursor": "<ref>"}}
```

`limit` defaults to 50 and is clamped at 200, `has_more` is exact (the store reads
`limit + 1` and the handler trims), `next_cursor` is the `ref` of the last row and is
omitted on an empty page. Send it back as `cursor`. Never page by offset, never sort
client-side: ordering is part of the contract per route (newest first, soonest due
first, `kind, name`).

Multi-value filters are comma-separated and always **widen**: `payee_ref=a,b` is
"either payee".

Creates that a client may retry carry `client_id`: entries, captures, exports,
imports. Same `client_id` + same body answers the stored row (`200`), same
`client_id` + different body is a `409` on the routes that guard it (imports,
exports). That is how a phone that lost the network mid-request stops double-posting.

### Two processes, one honest delay

`spenicle http` serves every route. `spenicle worker` runs on its own interval
(`WorkerInterval`, one hour by default) and does six things in order: queue a capture
per due recurring rule, reclaim artifacts of rejected captures, drop expired import
drafts and abandoned uploads, claim and sweep export jobs, then poll the mailbox.
There is no push channel: anything a job produces arrives on the next tick, so a
client **polls its own ref** (`GET /api/exports/{ref}`, `GET /api/imports/{ref}`) and
renders `queued`/`running` honestly instead of spinning. `GET /healthz` reports
`worker_last_run_at`, which is how a client tells "the worker never ran" from "the
worker is thinking".

## RRR — the deck as one product

### Requirements

1. **Two seconds to capture, zero seconds of organizing.** A capture call must never
   need an account, a category or an amount. Photograph, paste, share: one request.
2. **The ledger changes only on an explicit human decision.** Capture approval, an
   entry post, an import commit. No worker writes a ledger row — invariant 6 of
   [`AGENTS.md`](../../AGENTS.md) — so every number a user sees has a person behind it.
3. **Every number is derived, never stored.** Balances, month spend, the dashboard
   tile, the export summary: all computed from postings at read time. No counter can
   drift; a correction moves every screen by itself.
4. **Nothing disappears.** Void writes a reversal; archive hides; revoke keeps the
   row. A client may only offer destructive-looking verbs that this contract can keep.
5. **A retry is safe.** Every create a phone or a script may retry is idempotent by
   `client_id`; every multi-step job (`imports`, `exports`) resumes from its own
   ref instead of failing.
6. **The API is additive-only.** No version prefix means the client must tolerate new
   fields and new enum values; it may never assume a field list is closed. Removing a
   field is a breaking change and needs the design doc first.
7. **Money never crosses the wire as a float.** A client that parses `"25000"` with a
   float parser has broken the contract on its side.
8. **One user, one container, no infrastructure.** A feature that needs Redis, a
   queue, a second process or a cron outside the image is out of scope by
   construction.

### Risks

| risk | why it hurts | what we do |
| --- | --- | --- |
| `APP_SECRET` loss | capture payloads, receipt files and export blobs become unreadable; the ledger survives | boot refuses a changed secret (`secret_mismatch`) rather than silently re-keying; the docs tell the operator to back the secret up next to the database |
| open mode on a public host | with no password set, every request is root | the first boot generates and prints a password once; the client shows the change-password screen first, and the readiness checklist below treats `password_must_change: true` as a blocker |
| no push channel | a recurring capture or a finished export waits up to `WorkerInterval` | every job route exposes its status and its event log, so the client can explain the wait instead of guessing; `worker_last_run_at` names the last tick |
| one writer at a time | SQLite `BEGIN IMMEDIATE` serialises writes; a long import commit blocks every other write | commits run in chunks of `ImportCommitChunk` (500) and are resumable, so a blocked writer is a slow writer, never a lost one |
| retention sweeps | a rejected capture loses its receipt after 720h; a ready export 410s after 720h | the row survives with `deleted_at`/`status = expired`, and the UI is told to say "the file was reclaimed", never "not found" |
| integer ids on the wire | capture approve's request struct accepts a `payee_id` integer and never reads it: a client that fills it believes a payee was attached | [F9](./09-gaps-and-next.md) gap 1 — the field has to be removed (and replaced by `payee_ref`), not honoured |

### Rollout

The unit of rollout is the **container image tag**, because the repository releases
by pushing a git tag (`vMAJOR.MINOR.PATCH`) and never moves a tag afterwards. The
client is deployed separately and speaks to a running instance, so the two deploy
orders that matter are:

1. **Server first, client later (always safe).** New routes and new optional fields are
   additive. A client on the previous version ignores them.
2. **Client first (only for features the server already has).** Every feature page
   below is live on `main`, so a client can ship against it today.

Before a client ships a feature that touches money, the readiness checklist is:

- [ ] `GET /healthz` answers `status: ok`, and `schema_version` is the one the client
      was built against (no version negotiation exists, so pin it).
- [ ] `worker_last_run_at` is non-empty: the worker process is alive, so a recurring
      capture or an export will not stall forever.
- [ ] The instance is closed: `password_must_change: false` on `GET /api/settings`,
      and the client holds a credential, not an open-mode session.
- [ ] `APP_SECRET` is backed up next to `spenicle.db` (captures and exports are sealed
      with it).
- [ ] Retention values are understood by the UI: artifacts `720h`, export blobs
      `720h`, import drafts `24h` past the last edit.

Rollback is never "delete the migration": the container keeps a forward-only schema,
so rolling back means running the previous image against the same file. Nothing in
this deck writes a destructive migration.
