# AGENTS.md

Context for any agent working in this repository. Read this first, then the design
doc it points at. Keep it current: if you change a command, a path or a release
rule, update this file in the same commit.

## What this is

**Spenicle v2** — a self-hosted, single-user expense tracker in Go. One binary, one
SQLite file, one container. The point is that logging a coffee costs two seconds, so
a missed week does not become a quit: **capture is separate from organizing**, and
nothing is organized automatically.

Not a SaaS template. Not multi-tenant. Not a general ledger product. The design is
locked in [`docs/v2-design.md`](./docs/v2-design.md); schema and endpoints in
[`docs/v2-api.md`](./docs/v2-api.md). When those documents and the code disagree,
the document wins until you change the document too.

## Invariants you must not break

1. **Identity.** Every table carries a bigint `id` as its own row identity — the
   ordering key, the sweep cursor — and a `ref`: a dashless UUID (32 lowercase hex) that
   is the only identifier the API speaks. **A relation between two rows is a `ref`**, never
   an `id`: `parent_ref`, `payee_ref`, `account_ref`, `entry_ref`, `batch_ref`,
   `upload_ref`, `export_ref`, `capture_ref`, `reversal_of_ref`, `recurring_rule_ref`,
   `resolved_entry_ref`. One table is the exception — `import_upload_chunks` is internal
   bookkeeping with an `id` and no `ref`, never addressed on the wire. Requests send
   `account_ref`, responses carry `ref` — an integer id never leaves the database. The
   ledger group is fully converted: accounts, payees, categorization rules, recurring
   rules, entries, postings, `entry_balances` and the journal payloads
   relate by ref, and their `*_id` columns are gone from `0001_init.sql`. So do captures,
   artifacts, `capture_payloads`, mail messages, imports, exports and `audit_log`. No
   column ends in `_id` at all: the idempotency key is `idempotency_key`, the capture
   grouping label is `captures.group_label`, and every relation between two rows is a
   `ref`.
2. **Double-entry.** Every entry has ≥ 2 postings whose native and base sums are both
   zero. `entity.CheckZeroSum` runs before the store opens the write transaction, on
   both direct entry inserts and capture approvals. `accounts.balance_minor` is a derived
   cache of the postings and never a source of truth: the write that inserts a posting adds
   its base amount to the account in the same transaction, `accounts.balance_dirty` marks a
   row to rebuild from `postings` before it is read, and `GET /api/accounts` rebuilds only
   the accounts that flag names.
3. **No deletes of user records.** Reverse (`reversed_at`) or reject. Every state change on
   `accounts`, `payees`, `recurring_rules`, `entries`, `captures`, `settings`,
   `api_tokens` and `categorization_rules` appends one `audit_log` row inside the same
   transaction, through `sqlite.appendAudit`, which opens its own span and validates the
   typed payload (`entity.EntryCreated` and friends, same `validate` tags as the API).
   Usage stamps (`TouchToken`), the worker heartbeat and first-boot seed accounts are
   exceptions. Derived `entry_balances` are rebuilt, and expired import drafts and
   uploads are deleted with their own event trail; committed and rejected batches keep
   their evidence. Import and export jobs keep their own append-only
   `import_events`/`export_events` instead of being journaled twice; artifact rows are
   metadata of a capture and are not journaled at all.
4. **Money is integers.** Minor units + ISO 4217 code. No `float64` anywhere, ever.
   Rates are exact decimals stored as `TEXT` and handled with `math/big.Rat`; rounding
   happens exactly once, half away from zero.
5. **Base currency and opening balances are locked together** when `POST /api/setup`
   completes (`settings.setup_completed_at`). A legacy instance that already has
   entries also stays locked. A foreign currency is a property of one transaction,
   never of an account.
6. **Capture ≠ ledger.** A capture never writes a ledger entry on its own. Approval does.
   This includes the recurring rules: the worker queues a `captures` row
   (`kind='recurring'`, `dedupe_key = sha256(rule|due)`) and never posts an entry while
   doing so; its process still receives ledger and export dependencies for intake and
   export rendering.
7. **One container, two supervised processes, one SQLite file.** `spenicle http` is
   the only listener; `spenicle worker` stages recurring captures, runs retention and
   import GC, renders exports and polls the mailbox, and opens no port. runit in the
   image supervises both. No Postgres, no Redis, no queue, no sidecar: adding
   infrastructure needs a design-doc change first.
8. **A code change ships its docs in the same commit.** Every route, field, status, code,
   cap, state or limit you touch updates the page that states it — `docs/endpoints/`,
   `docs/v2-api.md`, `docs/product-deck/`, `README.md`, `openapi.json`, this file — in the
   commit that changes the behaviour, never in a follow-up. A doc that is not updated is a false
   claim, and a false claim is a defect: the docs are checked against the code, not the
   other way round. Record the check in [`docs/alignment.md`](./docs/alignment.md) when a
   change moves the verdict.

## Layout

```
cmd/root.go              the cobra root: signal wiring and the hidden `all` command
cmd/http/              package httpcmd: `spenicle http`, the handler graph, the route
                       table, the middleware chain and the serve loop
cmd/http/handlers/     `Server`: one file per endpoint group, no route, no middleware
cmd/worker/            package workercmd: `spenicle worker`, the recurring loop
cmd/worker/handlers/   `Runner`: the recurring rules, the catch-up cap and the heartbeat
config/runit/          the two runit services the image supervises: run + finish each
uat/                   godog suite: uat.go, steps_*.go, world_*.go, snapshot*.go, features/
internal/common/       no business logic: config (also the process graph), clock, seal,
                       otel, logging, httpx, uuid, binding, validating, list, access,
                       actor (who the current change belongs to, for the journal)
internal/constant/     every fixed value shared by more than one package: enums, the
                       audit kinds/actions/actors, the token scopes
internal/entity/       shared structs + invariants; imports stdlib + constant only
internal/module/       business logic: ledger, captures, imports, exports, export, rates,
                       settings, tokens, connections, intake, categorization
internal/repository/   contracts, plus the adapters: sqlite, ecb, filestore, mailbox/gmail,
                       oauth/google, extraction/{snaptojson,openai}, and `cache` — the one
                       in-process TTL primitive (`Get`/`Set`/`Load`/`Delete`/`Clear`, a
                       single flight per key). A module that reads a table on every request
                       holds its own `cache.Cache`, and the path that writes that table calls
                       `Delete`/`Clear`; nothing caches inside a handler.
tools/openapi/         the OpenAPI 3.1 generator: `go run ./tools/openapi` reads the
                       annotations on the handlers and writes `openapi.json` at the
                       repo root
web/                   the SPA: React 19 + Vite + TanStack Router/Query, forms on
                       react-hook-form with Effect Schema rules, headless Ark UI,
                       typed from `openapi.json` by `make web-types`. Toolchain:
                       pnpm (pinned by `packageManager`), oxlint (curated rules, warnings
                       denied), oxfmt, tsgo (`@typescript/native-preview`). `make web`
                       builds `web/dist`, which the binary serves on the API's own port when
                       it was compiled with `-tags web` (the `latest` image); `web/assets_*.go`
                       is the whole switch. Screens: `/` sign in, `/setup` the claim
                       wizard (password, base currency, one optional opening account),
                       `/dashboard`, `/ledger` (+ `/ledger/new`, `/ledger/{ref}`), `/analytics`,
                       and `/manage` (the index plus everything it owns: `/manage/accounts` (+
                       `/new`, `/{ref}`, `/{ref}/edit`: asset, liability, equity),
                       `/manage/categories` (the same four routes, for expense and income accounts:
                       a category is an account, not a table), `/manage/payees` (the same four: a
                       name plus an optional default account and category), `/manage/captures` (+
                       `/{ref}` to review one), `/manage/exports`), plus `/settings`. The shell has
                       two shapes: from `lg` a header with Register, Analytics and Manage on the
                       left and Settings plus Log out on the right; below `lg` no header at all,
                       and a five-slot bottom bar: register, analytics, a new entry in the middle,
                       manage and settings. A screen opens with `PageHeader`: a breadcrumb, then
                       its title on `lg` and up only, then one transparent action. No subtitle.
                       The claim screen at `/setup` is two fields: password and currency.
                       palette ramps, two self-hosted fonts (Inter for everything, JetBrains
                       Mono for every figure) behind a semantic token layer, light and dark
                       theme blocks whose default follows the client, and the base layer. A screen composes `Panel`, `Field`,
                       `Button` and `Text`, and `src/modules/<entity>` for everything it
                       says about a row: a module owns its entity's component, fallbacks,
                       flags and tone, so a `routes/*` page composes modules and never reads
                       a field to decide how a row looks. Each module keeps one component per
                       file (`entry-register.tsx`, `account-balances.tsx`) with an `index.ts`
                       barrel, and `src/providers/` holds the two contexts the shell needs:
                       `AppProvider` gates on `/api/bootstrap` before any screen renders and
                       never reads `/api/meta`; `AuthProvider` owns the scoped token
```

The binary is a cobra CLI. `spenicle http` serves the API, `spenicle worker` stages
recurring captures, runs retention/GC and intake, renders exports and opens no port, and
the hidden `spenicle all` runs both in one process for local development. Each command
owns its composition root: `cmd/http/http.go` and `cmd/worker/worker.go` mount the
command and call `telemetry.SetIdentity` before `config.Start`; `handler.go` next to each
one builds `handlers.Deps` / `handlers.Runner` from the shared graph (config, logger,
store + migrate, sealer, settings, ledger, rates) in `internal/common/config/process.go`.
An unknown subcommand is cobra's usage error and exit code 1.

### Two processes, one SQLite file

`http` and `worker` are separate OS processes on the same database, so the write path
is designed for it: the DSN carries `_txlock=immediate`, which takes the write lock
when a transaction begins instead of upgrading mid-transaction (that upgrade is what
turns into `SQLITE_BUSY` between two processes), `busy_timeout(5000)` keeps the loser
waiting rather than failing, WAL lets readers proceed during a write, and migrations
re-check `schema_migrations` inside the transaction, so two processes booting at once
apply each version exactly once. Switch to WAL is the one statement `busy_timeout`
does not queue for, so `sqlite.Open` retries a locked connection for a couple of
seconds: a fresh file can be opened by both processes at once without one of them
dying. The result is one writer at a time across the container, never two: anything
that needs more than that is a design-doc change.

Rules that keep it pluggable:

- Every directory has a root file that presents **only its interface**
  (`repository.go`, `ledger.go`, `entity.go`, `uat.go`, `sqlite.go`). A second adapter
  is one new implementation, not a new call site.
- Dependencies point inward: `cmd` → `module` → `entity` + `repository` contracts.
- Validation is declarative at every boundary. An outer-world struct — a request body,
  registry per package enforces it (`internal/common/validating` for every request and
  query struct, `internal/common/config` for the config). Handlers call
  `bindBody`/`bindQuery`/`bindPath`; nothing parses a number by hand and no struct is
  declared inside a function. `writeInvalid` turns the failure into `422` and the
  `validating` code table promotes a field failure back to the domain code a client
  branches on (`unknown_currency`, `invalid_postings`).
  A date or an amount is parsed in exactly one place: `validating.Day` and
  `validating.Money`, used by `binding` and by every handler. A store may still parse a
  column it is scanning back (that is corrupt data, not a bad request) and nothing else.
- The code documents itself. No comment restates what a name already says, and no
  method carries a doc comment. The only comments left are the package doc comment
  (`revive` requires it), toolchain directives — `//go:embed`, `//go:build`, and
  `//nolint` with its reason — and the swagger annotation block above a handler. That
  block is metadata, not prose: it is what `tools/openapi` reads to publish a route,
  which is why it cannot start with the symbol name or end in a period, and why the
  three style linters that demand both are switched off for `cmd/http/handlers/`.
  Anything worth explaining about *why* lives here or in `docs/`.
- Every method that crosses a boundary takes `ctx context.Context` first and opens one
  span named after the layer: `Repository.Sqlite.InsertEntry`, `Module.Ledger.Post`,
  `Handler.Entries.Post`, `Common.Seal.Seal`. There is exactly one
  `context.Background()`, in `cmd/root.go`, wrapped in `signal.NotifyContext`;
  everything derives from it. Pure value code (`entity` validation, `clock`) takes no
  context and opens no span.

## Commands

```bash
make hooks      # install the git hook (build + lint + test + UAT before commit)
make build      # bin/spenicle, no SPA
make dev        # go run -tags web . all (SPA on :8080, writes to ./data)
make dev-api    # the API alone, SPA embedded, ./data
make dev-worker # the worker alone, same database
make dev-web    # the SPA dev server on :5173, proxying /api to :8080
make stop       # kill whatever owns :8080, printing its pid and cwd
make fresh      # stop, rm -rf ./data, rebuild the SPA, then make dev
make check-fresh # assert GET /api/bootstrap answers setup_completed:false
make test       # unit and integration tests (UAT has its own target)
make uat        # the Gherkin suite plus the containerised mock services (needs Docker)
make uat-snapshots   # rewrite snapshot files, then review the diff
make cover      # coverage over the whole module; -coverpkg makes the UAT count
make fmt        # gofmt the tree
make openapi    # regenerate openapi.json from the handler annotations
make web        # build the SPA into web/dist
make web-check  # the SPA's gate: tsgo, oxlint, oxfmt --check, vitest
make web-types  # regenerate the SPA's typed client from openapi.json
make lint       # all four groups; every one must stay at 0 issues
make lint-fix   # safe automatic fixes (style, then correctness)
```

`make dev` and `dev-api` rebuild `web/dist` when a source is newer than the bundle, because
`go run -tags web` embeds it at compile time and would otherwise serve the previous UI.
`make` with no target lists the entry points; `make` is the only build file (`dev.mk` is gone).

`mise.toml` pins the local toolchain: `go` from `go.mod`, `golangci-lint` from CI,
`lefthook` for the hooks, and `node` + `pnpm` for `web/`. Run `mise install` once per
clone; `make` stays the entry point.

`lefthook.yml` wires the checks into two hooks: `pre-commit` runs lint, build, test and
UAT in that order, `pre-push` runs build and UAT only; install it with `make hooks`.
Agents that commit must run the checks themselves anyway — CI is the judge, the hook is
the convenience.

Run `make lint`, `make test` and `make uat` before you call anything done. All four
lint groups report `0 issues` today; a new finding is yours to fix, not to silence —
unless it is a documented false positive, in which case use the narrowest `//nolint`
with a reason string.

Lint is four configs, not one, on purpose: `tools/lint/{correctness,style,security,performance}.yml`.
There is deliberately **no root `.golangci.yml`** (the union drifts). CI runs them as
four steps in one `lint` job; each step uses one config and all four report, so a style
failure cannot hide a security failure.

## Environment

Un-prefixed, all optional except `APP_SECRET`. Secrets and identity come from the
environment; every *limit* has a default in `internal/common/config/config.go` and an
override, so the eight limit variables (`APP_MAX_BODY_BYTES`, `APP_ARTIFACT_MAX_BYTES`,
`APP_IMPORT_MAX_BYTES`, `APP_ARTIFACT_RETENTION`, `APP_EXPORT_RETENTION`,
`APP_WORKER_INTERVAL`, `APP_HEALTH_TIMEOUT`, `APP_IMPORT_COMMIT_CHUNK`) are the only ones a
self-hoster may need to touch without a rebuild. The listen address (`:8080`), the data
directory (`./data`), the DB path, the artifact and export
stores and every timeout are constants in `internal/common/config/config.go`.

| var | default | meaning |
|---|---|---|
| `APP_SECRET` | **required** | ≥ 16 bytes; seals sensitive columns, identifies the database |
| `APP_TIMEZONE` | `UTC` | IANA name for every calendar decision (the worker's "today"); set once, at the first boot |
| `SNAPTOJSON_API_KEY` | — | enables the SnapToJSON extraction vendor; unset = manual entry |
| `SNAPTOJSON_ENDPOINT` | vendor route | override for a proxy or a staging account |
| `OPENAI_API_KEY` | — | **reserved**: the OpenAI adapter exists but `config.SelectRail` never builds it, so extraction is SnapToJSON only; `ai_assistance` is still computed (`OpenAIKey && OpenAIHost && model set`) and served by `GET /api/settings` and `GET /api/meta` — what is inert is the chat rail, so no assistance is ever produced |
| `OPENAI_MODEL` | `gpt-4o-mini` (`DefaultOpenAIModel`) | model the OpenAI adapter asks for; wired by tests only today |
| `OPENAI_HOST` | — | base URL for the OpenAI adapter; empty keeps the SDK default (`DefaultOpenAIHost` documents it) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP/HTTP collector; empty = tracing/metrics are no-ops |

`APP_SECRET` is mandatory: `config.Load` fails without it, and `EnsureBaseline`
fails when its fingerprint does not match `settings.secret_fingerprint`. There is no
in-place reset: a changed secret means restoring the original, or starting over with
a fresh database (delete `spenicle.db`; the next boot migrates and seeds it). The
sealed capture payloads are unrecoverable without the old key; the ledger is
plaintext and survives either way.

The base currency and the login password are **not** environment variables: they are
the sealed JSON row in `settings` (`entity.Settings`), owned by `module/settings`. The
password is a PBKDF2-SHA256 hash inside that row and **does not exist until
`POST /api/setup` sets it**: a fresh database boots open, with no generated password and
no claim file, and `GET /api/bootstrap` publishes `claimable: true` so a client knows to
show the claim screen. `POST /api/setup` sets the password, chooses the base
currency and optionally creates accounts with nonzero opening balances in one
transaction. Completion locks the currency, even when the request carries no opening
accounts; a legacy database with entries is already locked. The open window is a
documented tradeoff: a container on a reachable port can be claimed by whoever gets
there first, so claim it before exposing the port.

**One credential header, two kinds.** There is no cookie and no exchange route: every
request carries `Authorization: Bearer <credential>`, and the **instance password** *is*
the root credential. Three routes are public and read no header at all — `/healthz`,
`/api/bootstrap` and the Google callback — which is why the shell can tell a fresh
instance from a sign-in screen before it holds anything. `module/settings.Root` verifies it against the stored PBKDF2 hash —
600k rounds, so the first verification is the slow one. The decoded settings row and a
verified credential digest are process-local with a one-hour TTL; setup and password changes
invalidate both immediately (the key includes the stored hash), and nothing touches disk.

Everything else is a token — a named, scoped, non-root credential (`module/tokens`).
Only the HMAC digest of the plaintext under `APP_SECRET` (`sealer.Digest`) is stored,
plus a masked preview (`spl_ab12…9f3c`) so two tokens are told apart; the plaintext
exists exactly once, in the `201` that created it. A token answers a route only if the
route lives in the scoped mux and the token carries the scope that route was registered
with (`groups.scoped.route(scope, pattern, handler)` — one line per route, no second
table); the root-only mux (`/api/tokens*`, `/api/password`, `PATCH /api/settings`) is
unreachable for a token, so a token can never mint a token. `admin` and `*` cover every scoped route.
Revoking is `POST /api/tokens/{ref}/revoke`: a token is never deleted, `revoked_at`
stamps it, the row and its journal entries stay and the credential stops working. The
middleware stamps `last_used_at` on every authenticated request, and the listing filters
on it (`?status=active|revoked&used=used|never`).

Uploaded capture artifacts live **outside** the database, under
`./data/artifacts/<sha[0:2]>/<sha[2:4]>/<sha256>`: the bytes are gzipped when the
content type is compressible (`text/*`, `application/json`, `application/xml`,
`application/pdf`), encrypted with AES-256-GCM under a key derived from `APP_SECRET`
(HKDF-SHA256, info `spenicle/artifact/v1`), and the plaintext sha is the additional
authenticated data. The `artifacts` row keeps only the metadata, so a deleted file is a
missing document, never a broken capture. The worker reclaims the artifact of a
`rejected` capture once it is older than `ArtifactRetention` (default `720h`, 200 rows
per run) and stamps `deleted_at`, which is what makes the download route answer `410`.
`ArtifactMaxBytes` (default `10 << 20`) is the upload ceiling the API refuses above;
`ArtifactDir` is `DataDir/artifacts`, so none of the three is an environment
variable.

**Statement import is two-phase, and the file is the client's.** `POST /api/imports`
takes a multipart `file`, a `idempotency_key` (≤ 64) and an optional `account_ref`, parses a
CSV whose header is exactly `occurred_on,amount_minor,description`, and writes a
**draft**: `import_batches` plus one `import_rows` row per line, in one transaction, with
the bytes put through `internal/repository/filestore` and only `file_hash` kept on the
Nothing reaches the ledger until `PATCH /api/imports/{ref}` takes one body action — the
review endpoint is a single route with two actions, not two routes. `commit` posts the
rows the user marked `accepted`, each with `idempotency_key = import:<file_hash>:<row_index>`
and `source = statement`, which is what makes a replayed commit a no-op; `reject` closes
the draft and keeps the evidence, and its optional `reason` (≤ 1000) is stored on the
event, never on the batch row. `import_events` is the append-only log of every
transition — `uploaded`, `resumed`, `conflict_refused`, `row_edited`, `row_accepted`,
`row_skipped`, `committed`, `rejected`, `expired` — written inside the service paths
(`actor = user`) and by the worker GC (`actor = worker`), and read back through
`GET /api/imports/{ref}/events` with the shared envelope. Clash detection runs once, at
upload, and is deterministic: `already_imported` (that row's `idempotency_key` is already in
the ledger), `duplicate` (same day, currency and absolute amount, with a posting on the
batch account), `possible_duplicate` (same amount and currency within 3 days),
`invalid_row` (the line does not parse). A row with any clash defaults to `skipped`;
`PATCH /api/imports/{ref}/rows/{index}` takes absolute values only, so a retry changes
nothing, it bumps `expires_at`, and it stamps `edited_at` once with the accumulated
`edited_fields`. Retention: a `draft` lives `24h` past its last edit and the worker
drops exactly those — rows, blob and one `expired` event, 50 per run — while a
`committed` or `rejected` batch keeps its rows, blob and events forever. `idempotency_key` is
the idempotency key: the same key with the same bytes resumes the draft (`200`), the
same key with different bytes is `409 import_conflict`, replaying the same review action
is `200` with the current batch, and the other action or a row edit on a terminal batch
is `409 import_closed`.

One thing is deliberately **not** an environment variable: whether the binary serves the SPA.
`web/assets_web.go` (`//go:build web`) embeds `web/dist`, `web/assets_off.go` returns nothing,
and the release images pick the tag per target (`latest` embeds, `server`/`cli` do not). The
Dockerfile's `APP_WEB` build arg is our switch only and refuses `off` for the full image — a
self-hoster cannot turn a UI on in bytes that are not there.

Only those eight are environment variables. **Every other knob — listen address, data
dir, DB path, HTTP timeouts, shutdown budgets, `/healthz` timeout, request body cap, pool
sizes, service timeouts, artifact dir, retention and size cap, export dir, retention and
stale window, import body/row caps and commit chunk, service name (also the tracer name) —
has its default in `internal/common/config/config.go`**, and the resulting value object is
`entity.AppConfig`. No viper, on purpose: eight variables and one file beat a precedence
chain nobody can predict. A new knob means a new constant and field in those two files,
nothing else; removing one means deleting the constant, the read and the field.

`GET /api/bootstrap` is the other public read, and the one a client uses before it holds a
credential: `setup_completed` (the setup marker), `claimable` (no password stored yet, so the
instance can still be claimed), `base_currency`, `timezone` and the capability flags, no
account and no secret. That is how the SPA's `/setup` route decides between the claim wizard
and the sign-in screen — `/healthz` stays liveness only.

`/healthz` returns `status`, `version` (`<tag>+<sha7>`), `started_at`, `schema_version`,
`app_secret` fingerprint, `base_currency`, `timezone` and `worker_last_run_at` (RFC3339, empty
until the worker finishes a run). The heartbeat is the `worker_last_run_at` row the
worker writes into `settings`, so the `http` process reports it even though it never
runs the worker itself. Use it to prove a running container is the build you think it
is, and that both services are alive.

The way out is a job, not a request. `POST /api/exports` writes a `queued` row and
answers `201`; the worker claims it, renders the ledger through `internal/module/export`
(one JSON document, or a zip of CSV sheets plus `summary.json` and `manifest.json`),
stores the bytes in the **export store** (`ExportDir`, `./data/exports`, a second
`filestore.Store` next to the artifact one) and marks it `ready`. `GET
/api/exports/{ref}/download` streams that blob and records a `downloaded` event;
`GET /api/exports/{ref}` and `GET /api/exports` are how a client watches the queue.
The document is refs only, no sealed value, and byte-identical for the same data, and
`summary` beside `data` carries the balances, the months and the categories the screen
wants without recomputing them. `export_events` mirrors `import_events`: `queued`,
`resumed`, `started`, `completed`, `failed`, `downloaded`, `expired`, `swept`, with
`actor = user` for the API paths and `actor = worker` for the claim, the sweep and the resume: a job left `running` by a restart is put back to `queued` before the worker claims, with a `resumed` event, so the document is produced instead of being failed. A
`idempotency_key` replay returns the same job (`200`); the same `idempotency_key` with another
`format` is `409 export_conflict`. A `running` job older than `ExportStaleAfter` is
failed (`swept`), and a `ready` job past `ExportRetention` (default `720h`, a month)
loses its blob **from the export store** and answers `410 gone` — 20 of each per run, and
a blob that is already gone is not an error.

`POST /api/imports` also takes a **chunked** upload: send `chunk_index` + `chunk_total` and the
handler appends to `./data/imports/<idempotency_key>.part`, records the chunk in
`import_uploads`/`import_upload_chunks` idempotently, answers `202` with the progress and
assembles the draft on the last chunk (`409 import_conflict` when the total disagrees,
`409 import_closed` for a finished upload). A commit is chunked too: the batch is flipped
`draft → committing` with a compare-and-swap, accepted rows post in chunks of
`ImportCommitChunk`, one `committing` event per chunk records `rows_done`/`rows_total`, and
a replayed commit resumes from the rows whose ledger `idempotency_key` is still missing. A row
edit while `committing` is `409 import_committing`.

The worker does seven things per run, in this order: queue a capture for each due recurring
rule (never an entry), reclaim
the artifacts of rejected captures, drop expired import drafts and `open` uploads older than
24h, claim up to 5 export jobs and sweep the queue, poll the configured mailbox
(`Module.Intake.Poll`), which queues captures and never posts an entry, refresh the query
planner's statistics (`PRAGMA optimize`, where SQLite decides which tables have moved enough
to re-`ANALYZE`), and finally stamp the heartbeat it reports as `worker_last_run_at`. Every
calendar decision it makes ("today", the due comparison, the business-day shift) runs in
`APP_TIMEZONE`, not UTC.
Statistics are a correctness issue, not a tuning knob: without them the planner reads the
schema blind and picks the wrong index for the register listing (`ix_entries_reversal_of_ref`
instead of `ix_entries_occurred`, plus a sort) and for the month roll-up. The store exposes
it as `OptimizeStats`; nothing else writes `sqlite_stat1`.

## Observability

Three signals, one vocabulary, no per-request guesswork.

Status: all three signals are wired. Spans (`telemetry.StartSpan`, one per boundary method), the
`otelhttp` transports on every vendor client, the metric instruments, the context logger
(`internal/common/logging`) and the provisioned dashboard in [`config/grafana/`](./config/grafana/observability.json)
exist today. What is still open is the trace propagation column: an export or import job does not
yet carry the caller's `traceparent`. [`docs/observability.md`](./docs/observability.md) is the how.

Rules that bind every change:

- **Logging goes through one context-aware logger.** `internal/common/logging`, package
  `logging`: `logger.Info/Warn/Error/Debug(ctx, msg, attrs…)` on a `*logging.Logger` built with
  `logging.New(component)`. Each record carries `component` (`http|worker`) and, when the context
  holds a valid span, `trace_id` + `span_id`, so a log line is always joinable to its span.
  Attributes are typed `slog.Attr`, never `...any`, so keys stay consistent. The level is not
  configurable: `Debug` for hot-loop detail, `Info` for branch outcomes and lifecycle (`no
  categories found`, `recurring run finished`), `Warn` for degraded-but-recovered (vendor down,
  sweep, retry), `Error` only when a request returns `5xx` or work is dropped.
- **One span per boundary method, none in pure code.** Every exported *and* private method that
  crosses a layer or does I/O opens exactly one span named `<Package>.<Receiver>.<Method>`
  (`Handler.Entries.List`, `Module.Ledger.Post`, `Repository.Sqlite.ListEntries`,
  `Worker.Recurring.Run`); validation, formatting and other pure functions open none. Outgoing
  HTTP clients (ECB, SnapToJSON, OpenAI) go through `otelhttp.NewTransport`, so a vendor call is
  a child span with its real status.
- **Attributes come from one constant set** in `internal/common/otel` (`telemetry.AttrVersion`,
  `AttrComponent`, `AttrRef`, `AttrJob`, `AttrRows`, `AttrOutcome`, `AttrOperation`,
  `AttrSource`, `AttrKind`, `AttrClashKind`) plus the semantic conventions where they exist
  (`http.request.method`,
  `http.route` as the *template*, `http.response.status_code`, `db.system=sqlite`,
  `db.operation`). `telemetry.StartSpan` stamps `spenicle.version` + `spenicle.component` on
  every span, so no call site repeats them; `telemetry.Ref` tags the current span. Kinds belong
  in attributes, never in the span name.
- **`http` and `worker` are separate processes**, so they cannot share a trace by accident:
  they share the attribute vocabulary, the same panels, and each opens its own root span
  (`Worker.Recurring.Run` per tick). Jobs do not carry a caller's `traceparent` today, so
  join a cross-process job by ref and time window until the propagation column and
  remote-parent resume land.
- **Metrics are prefixed `spenicle.`**, dotted lowercase, units in the instrument option and
  never in the name (`_seconds`, `By`, `1`): `spenicle.http.server.requests|duration|in_flight`,
  `spenicle.worker.runs|items|run.duration`, `spenicle.entries|postings`,
  `spenicle.captures.transitions`, `spenicle.imports.rows|clashes`, `spenicle.exports.bytes`,
  `spenicle.sqlite.locked`, plus `otelruntime`. Attributes are bounded enums only (`job`,
  `outcome`, `operation`, `source`, `clash.kind`, `http.route`); a ref, a name or an amount in
  an attribute is a defect. Lock losses are recorded on `open`, `begin`, `write` and `commit`.
- **The dashboard and its alerts are code**:
  [`config/grafana/observability.json`](./config/grafana/observability.json) holds the
  provisioned JSON, [`config/prometheus/alerts.yml`](./config/prometheus/alerts.yml) holds the
  SQLite contention rules, and [`docs/observability.md`](./docs/observability.md) explains the
  OTLP wiring, the metric table and how a `trace_id` joins a log line to its span, so a panel or
  an alert changes like any other diff.

## Dependencies

The direct requirements in `go.mod` earn their place: `spf13/cobra` for the CLI (a root
command, `http`, `worker` and the hidden `all`), `go-playground/validator` for the
declarative `validate` tags, `modernc.org/sqlite` as the cgo-free driver,
`openai/openai-go` for the adapter wired by tests, the OpenTelemetry modules for traces,
metrics and their instrumentation (`otelhttp` on every vendor client, `runtime` for the Go
collector), `cucumber/godog` and `testcontainers-go` for UAT, and `go.uber.org/mock` for the
generated mocks (`mockgen`, pinned by `tools/tools.go`), and `swaggo/swag/v2` for the
OpenAPI document the annotations above each handler are rendered from. `config.SelectRail` uses
SnapToJSON only today. A new dependency needs a reason in the MR, not a `go get`.

## Testing

- Unit tests sit next to the code they test (`internal/entity/money_test.go`,
  `internal/repository/sqlite/store_test.go`). Use `t.Context()`, never
  `context.Background()`.
- **Table-driven tests are mandatory** for anything with more than one case: one `tests :=
  []struct{ name string; ... }` slice, `t.Run(tc.name, ...)`, no repeated arrange blocks. A
  single happy-path assertion does not need a table; a second case does.
- **Interfaces are mocked with `go.uber.org/mock`** (`gomock`), never by hand. Generate with
  `//go:generate go run go.uber.org/mock/mockgen -source=<file>.go -destination=mocks/<file>.go
  -package=mocks` next to the contract, run it with `make mocks`, and commit the generated
  file. `tools/tools.go` pins the generator version (build tag `tools`), which is also what
  keeps it in `go.mod`. Hand-written stubs already in a test may stay until that test is
  touched; new ones are not accepted.
- UAT is Gherkin via godog, over the **real** handler and a **real** SQLite file in a
  temp dir — no mocks. Steps are generic (`I send a POST to "/api/entries" with:`,
  `the response JSON matches the snapshot "..."`), so a new endpoint usually needs no
  new step. `{{account:Cash}}`, `{{ref}}` and `{{bodyhash}}` expand from the scenario
  so far.
- The suite is one `uat` package split by topic: `steps.go` wires every regex,
  `steps_requests.go`, `steps_responses.go`, `steps_fixtures.go`, `steps_snapshots.go`,
  `steps_vendors.go`, `steps_worker.go`, `steps_exports.go`, `steps_imports.go` and
  `steps_boot.go` hold the steps, `world.go` the scenario state,
  `world_boot.go`, `world_graph.go`, `world_http.go`, `world_database.go` and
  `world_worker.go` its plumbing, and `snapshot.go`, `snapshot_compare.go` and
  `snapshot_export.go` the snapshot machinery.
- Every response is asserted as a whole body — there is no field-path step — and the
  status step carries the intent. The compare runs the contract invariants over the
  body first (no `id` key, 32-hex refs, money as strings), so a snapshot cannot bless
  a leak.
- Snapshots: `the response JSON matches the snapshot "x"` compares
  `uat/snapshots/api/x.json`; `the database matches the snapshot "x"` dumps the
  allow-listed tables to `uat/snapshots/db/x.json`. Timestamps, refs (also inside
  prose), sealed envelopes, the build version and the secret fingerprint are
  normalised. A missing snapshot is written and fails the step;
  `UAT_UPDATE_SNAPSHOTS=1` (`make uat-snapshots`) rewrites them on purpose.
- Fixtures reach states no request can: `the database is cleared` (children first, see
  `clearOrder` in `uat/world_database.go`), `the local cache is cleared` (the rates cache, so
  the next read proves the database fallback), `the connection is broken` (the store
  is closed, so the next call must answer `500 internal_error` with the generic message
  `internal error`, plus `the failure is logged`, `the store holds:` for row counts,
  `the journal holds N "<entity_kind>" rows` when a raw total would count the rows the
  boot itself seeds, and `the account "Cash" exists as "asset"` for seeds.
- Authentication: the suite runs in open mode by default — no password is seeded, so every
  request passes. `the instance password is "..."` seeds one *before* boot, `I sign in with
  the instance password` stores the credential the world then sends, `the issued token is the
  bearer credential` swaps in the token from the last response, and `only the root credential
  is used` drops it again. That is the whole harness for scope tests.
- `boot.feature` covers the process, not a route: an unusable database path and a
  database whose migration cannot run must stop the boot (`I boot the API`, `the boot
  fails`, `the boot failure mentions "..."`) instead of serving a half-ready API.
- Requests with headers or query parameters use a table, the body stays a docstring:

  ```gherkin
  And the request body is:
    """json
    {"kind":"share"}
    """
  When I send a POST to "/api/captures" with headers/query:
    | type   | key          | value            |
    | header | Content-Type | application/json |
    | query  | limit        | 10               |
  ```

- One feature file per route (`POST_api_entries.feature`, `PATCH_api_captures_:ref.feature`),
  never per behaviour: a failing file names the endpoint. Repetition goes in
  `Scenario Outline` + `Examples` inside that file.
- External services are the only things mocked, and they are Go programs under
  `uat/mock/`: one container serves the SnapToJSON partner route, the OpenAI chat
  completion and the ECB daily sheet, each with two twins: `/down` answers `503` and
  `/malformed` answers `200` with a body the adapter cannot parse. `uat/mock_test.go`
  starts it through testcontainers in `TestMain` and hands the endpoints of every vendor
  to the Gherkin suite (`uat.Options`) and to the adapter tests. Scenarios that need it
  carry the `@vendors` tag and skip when Docker is absent; `the extraction rail is
  "..."`, `the extraction|rates vendor is down` and `the extraction|rates vendor breaks
  its contract` pick the wiring before `a running API` boots.
- `uat` assembles the dependency graph by hand instead of calling `config.Start`: the
  commands own their wiring and are not importable as a composition root. It imports
  only the HTTP surface (`httpcmd.New` — route table plus middleware) and the worker's
  `cmd/worker/handlers.New`. Adding a dependency to `config.Start` means adding it to
  `uat/world_graph.go` too. Seeds, schema and first-boot settings live in the adapter
  (`sqlite.EnsureBaseline`), not in a module.

## Where the rest lives

| file | for |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | branches, commits, MR body, ticket shape, review gates |
| [`skills/`](./skills/README.md) | task recipes: release, observability, updates, contribute, ai-integration |
| [`docs/endpoints/`](./docs/endpoints/README.md) | one page per route; same sections everywhere, including the sequence diagram |
| [`docs/product-deck/`](./docs/product-deck/README.md) | one page per user-facing feature, client POV: journeys, backend path end to end, RRR, acceptance criteria |
| [`docs/alignment.md`](./docs/alignment.md) | the check log: which commit the docs were verified against, by whom, and the release verdict |
| [`openapi.json`](./openapi.json) | the published API document: OpenAPI 3.1, generated by `make openapi` from the annotations on the handlers and joined with the route table |
| [`docs/plan/`](./plan/simplification.md) | the technical plans that need a decision before code: naming, balances, caching, indexes, request ids |
| [`.env.example`](./.env.example) | every variable with its default, copy to `.env` |
| [`LICENSE`](./LICENSE) | source-available: personal unmodified use only, no commercial use |

## Committing

Conventional Commits, one logical change per commit, imperative subject, no body
unless a fact cannot fit the subject:

```
feat: trace every method and derive every context from the caller
fix: flush telemetry after the signal cancels the context
docs: link every commit in the release notes
```

Scopes exist but are rarely needed. Never a file path or a ticket number.

## Releasing

**A pushed git tag is the only way to release.** No workflow dispatch, no manual
upload:

```bash
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```

- Tag must be semver (`vMAJOR.MINOR.PATCH`); anything else matching `v*` fails the run
  before publishing.
- The artifact is the **container image only**: `ghcr.io/<owner>/spenicle` tagged
  `v0.2.0`, `0.2.0`, `sha-<sha7>`, `latest`, built for `linux/amd64` and
  `linux/arm64`. No tarballs, no checksums — see
  [`docs/releasing.md`](./docs/releasing.md) for why and for the digest-pinning recipe.
- Release notes are generated: a table (image, digest, platforms, commit, version) plus
  every commit since the previous tag as a **clickable link**, then a compare link.
- Never move or reuse a tag. Broken release → tag the next patch.
- Step by step, including how to choose patch/minor/major: [`skills/release`](./skills/release/SKILL.md).

## Working with telemetry

`OTEL_EXPORTER_OTLP_ENDPOINT` is OTLP/HTTP (port 4318). A bare host is treated as
**HTTPS**; `http://` must be written on purpose. `ServiceName` is the only identity:
it becomes `resource.service.name` and the tracer name, and each command sets its own
before telemetry starts: `spenicle-http` in `cmd/http`, `spenicle-worker` in `cmd/worker` and
`spenicle` for the hidden `all`. Each command owns its literal and passes it to
`config.Start`; `internal/common/config` knows no caller name. Span names are
layer-qualified (`Repository.Sqlite.InsertEntry`) and opened directly with
`telemetry.StartSpan` — never through a local wrapper. Details and failure modes:
[`skills/observability`](./skills/observability/SKILL.md).

## Known traps

- `docker run` as uid `10001`: use a **named volume** (`-v spenicle-data:/data`). A bind
  mount needs `chown -R 10001:10001 ./data` first. PID 1 is `runsvdir` as root; the two
  services drop to `10001` through `chpst`, so a file written by one is the same owner
  for the other.
- `sv` is the supervisor's handle, not `docker stop`: `docker exec <c> sv status
  /etc/service/spenicle-http /etc/service/spenicle-worker` answers `run:` or `down:`,
  `sv restart spenicle-worker` restarts one process while the other keeps serving, and a
  `down` file in the service dir keeps it stopped across a restart. The worker opens no
  port; a `docker stop` is a clean exit because runit forwards the
  signal and waits for both processes.
- The telemetry flush uses `context.WithoutCancel`; the signal that stops the process
  already cancelled the root context, and without this the last span batch is lost.
- `golangci-lint` `dupword --fix` has silently eaten SQL (`NULL` removed from a
  `VALUES` list) and `golines` flattened raw SQL into escaped one-liners. Both are
  removed from the lint configs; do not re-add them.
- `internal/common/otel` is package `telemetry` (import alias) so it does not shadow
  `go.opentelemetry.io/otel`.
- The artifact files are encrypted with `APP_SECRET`, exactly like the sealed columns:
  a changed secret does not make them readable again, it makes them garbage. Restore the
  old secret or start over, and remember that the ledger survives either way. Rename the
  artifact directory in (`./data/artifacts`) and the next boot silently records every
  capture as having a document that no longer opens — the row is metadata, the file is
  the document, and nothing cross-checks the two.
- The SPA is embedded at **compile** time (`-tags web` reads `web/dist`), so a stale
  `web/dist` is a stale UI with no warning: `go run -tags web .` happily serves yesterday's
  bundle and a sprite of the API it no longer matches. `make dev` now rebuilds `web/dist`
  whenever a source is newer than the built index; `make web` forces it. A browser holding
  the old service-worker shell needs one hard reload after a rebuild.
- `rm -rf ./data` does not reset a running process: `make dev` already holds the SQLite
  inode, so the instance keeps answering from a deleted (or foreign) database and
  `/api/bootstrap` still says `setup_completed: true` — "already claimed" for a directory
  that no longer has a database. `make fresh` stops the listener first, wipes `./data`,
  rebuilds the SPA and starts a new instance; `make check-fresh` is the assertion, not the
  browser. Two data directories on one port is the same trap with a different cwd, which is
  why `make stop` prints where the process it killed was running.
- A database created by an earlier build of this tree is not migrated into the new setup
  flow: it still carries a password and no `setup_completed_at`, so `/api/bootstrap` answers
  `setup_completed: false` with `claimable: false` — the marker never landed, but the open
  window is closed, and every route wants that old password. The SPA reads `claimable`, so it
  shows the sign-in screen instead of a claim form the API refuses with `401`. If nobody
  remembers that password, delete `spenicle.db` and claim the fresh instance; there is no v2
  release to migrate.
- A fresh database has no password, which means the API is open until `POST /api/setup`
  lands: every request is the root credential. That is the one window a self-hoster has to
  think about — claim the instance before publishing the port, and remember that deleting
  `spenicle.db` re-opens it. `GET /api/bootstrap` reports `setup_completed: false` while
  the window is open.
- Migrations are embedded and applied on boot (`internal/repository/sqlite/migrations`).
  There is exactly one file, `0001_init.sql`, so `schema_version` is 1. The former
  `0002`-`0006` changes were merged into it because no v2 release exists yet; a
  pre-release database from the six-migration layout must be recreated. The `v0.0.x`
  tags are the v1 tree (`apps/backend/`), so no v2 release exists yet. Once a v2
  release exists, forwards only — never edit an applied migration, add the next
  number. The splitter is naive: no `;` inside a migration comment.
