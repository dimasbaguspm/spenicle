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

1. **Identity.** Every table carries a bigint `id` for the foreign keys and a `ref`:
   a dashless UUID (32 lowercase hex) that is the only identifier the API speaks.
   Requests send `account_ref`, responses carry `ref` — an integer id never leaves the
   database.
2. **Double-entry.** Every entry has ≥ 2 postings whose native and base sums are both
   zero. `entity.CheckZeroSum` runs before the insert and again inside the write
   transaction.
3. **No deletes.** Void (`voided_at`) or reject. Every mutation appends to `audit_log`.
4. **Money is integers.** Minor units + ISO 4217 code. No `float64` anywhere, ever.
   Rates are exact decimals stored as `TEXT` and handled with `math/big.Rat`; rounding
   happens exactly once, half away from zero.
5. **Base currency is locked** at first boot (`settings.base_currency`). A foreign
   currency is a property of one transaction, never of an account.
6. **Capture ≠ ledger.** A capture never writes a ledger entry on its own. Approval does.
7. **One container, two supervised processes, one SQLite file.** `spenicle http` is
   the only listener, `spenicle worker` only posts due rules, and s6-overlay in the
   image supervises both. No Postgres, no Redis, no queue, no sidecar: adding
   infrastructure needs a design-doc change first.

## Layout

```
main.go                the cobra root: signal wiring and the hidden `all` command
cmd/http/              package httpcmd: `spenicle http`, the handler graph, the route
                       table, the middleware chain and the serve loop
cmd/http/handlers/     `Server`: one file per endpoint group, no route, no middleware
cmd/worker/            package workercmd: `spenicle worker`, the recurring loop
cmd/worker/handlers/   `Runner`: the recurring rules, the catch-up cap and the heartbeat
config/s6/s6-rc.d/     the two longrun services s6-overlay starts in the image
uat/                   godog suite: uat.go, steps.go, world.go, features/
internal/common/       no business logic: config (also the process graph), clock, seal,
                       otel, httpx, uuid, binding, list
internal/constant/     every fixed value shared by more than one package
internal/entity/       shared structs + invariants; imports stdlib + constant only
internal/module/       business logic: ledger, captures, imports, rates, settings
internal/repository/   contracts, plus the adapters: sqlite, ecb, filestore,
                       extraction/{snaptojson,openai}
```

The binary is a cobra CLI. `spenicle http` serves the API, `spenicle worker` posts the
due recurring rules and opens no port (it ignores `ADDR`), and the hidden
`spenicle all` runs both in one process for local development. Each command owns its
composition root: `cmd/http/http.go` and `cmd/worker/worker.go` mount the command,
`handler.go` next to each one builds `handlers.Deps` / `handlers.Runner` from the
graph, and the graph they share (config, logger, telemetry identity, store + migrate,
sealer, settings, ledger, rates) is `config.Start`/`config.Process` in
`internal/common/config/process.go`. An
unknown subcommand is cobra's usage error and exit code 1.

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
  a query binding, an app-config value — declares its shape as `validate` tags, and one
  registry per package enforces it (`cmd/http/handlers/validate.go`,
  `internal/common/config`). Handlers call `bindBody`/`bindQuery`/`bindPath`; nothing
  parses a number by hand and no struct is declared inside a function. `writeInvalid`
  turns the failure into `422` and `validationCodes` promotes a field failure back to
  the domain code a client branches on (`unknown_currency`, `invalid_postings`).
- The code documents itself. No comment restates what a name already says, and no
  method carries a doc comment. The only comments left are the package doc comment
  (`revive` requires it) and toolchain directives: `//go:embed`, `//go:build`, and
  `//nolint` with its reason. Anything worth explaining about *why* lives here or in
  `docs/`.
- Every method that crosses a boundary takes `ctx context.Context` first and opens one
  span named after the layer: `Repository.Sqlite.InsertEntry`, `Module.Ledger.Post`,
  `Handler.Entries.Post`, `Common.Seal.Seal`. There is exactly one
  `context.Background()`, in the root `main.go`, wrapped in `signal.NotifyContext`;
  everything derives from it. Pure value code (`entity` validation, `clock`) takes no
  context and opens no span.

## Commands

```bash
make hooks      # install the git hook (build + lint + test + UAT before commit)
make build      # bin/spenicle
make run        # DATA_DIR=./data ADDR=:8080 go run . all
make test       # go test ./... (unit + UAT)
make uat        # the Gherkin suite plus the containerised mock services (needs Docker)
make uat-snapshots   # rewrite snapshot files, then review the diff
make cover      # coverage over the whole module
make fmt        # gofmt the tree
make lint       # all four groups; every one must stay at 0 issues
make lint-fix   # safe automatic fixes (style, then correctness)
```

`lefthook.yml` wires the same four checks into `pre-commit` and `pre-push`; install it
with `make hooks`. Agents that commit must run the checks themselves anyway — CI is
the judge, the hook is the convenience.

Run `make lint` and `make test` before you call anything done. All four lint groups
report `0 issues` today; a new finding is yours to fix, not to silence — unless it is
a documented false positive, in which case use the narrowest `//nolint` with a reason
string.

Lint is four configs, not one, on purpose: `tools/lint/{correctness,style,security,performance}.yml`.
There is deliberately **no root `.golangci.yml`** (the union drifts). CI runs each group
in its own job, so a style failure cannot hide a security failure.

## Environment

Un-prefixed, all optional except `APP_SECRET`:

| var | default | meaning |
|---|---|---|
| `DATA_DIR` | `./data` | SQLite file and artifacts live here |
| `ADDR` | `:8080` | listen address |
| `APP_SECRET` | **required** | ≥ 16 bytes; seals sensitive columns, identifies the database |
| `SNAPTOJSON_API_KEY` | — | enables the SnapToJSON extraction vendor; unset = manual entry |
| `SNAPTOJSON_ENDPOINT` | vendor route | override for a proxy or a staging account |
| `OPENAI_API_KEY` | — | second extraction rail; used when SnapToJSON is unset |
| `OPENAI_MODEL` | `gpt-4o-mini` | vision model for the OpenAI rail |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | — | OTLP/HTTP collector; empty = tracing/metrics are no-ops |
| `WEB_ORIGIN` | — | the one browser origin allowed to call the API with a cookie; unset = same-origin only |

`APP_SECRET` is mandatory: `config.Load` fails without it, and `EnsureBaseline`
fails when its fingerprint does not match `settings.secret_fingerprint`. There is no
in-place reset: a changed secret means restoring the original, or starting over with
a fresh database (delete `spenicle.db`; the next boot migrates and seeds it). The
sealed capture payloads are unrecoverable without the old key; the ledger is
plaintext and survives either way.

The base currency and the login password are **not** environment variables: they are
the sealed JSON row in `settings` (`entity.Settings`), owned by `module/settings`. A
fresh boot generates the first password, prints it once, and requires a change after
the first sign-in. The password is stored as a PBKDF2-SHA256 hash inside that sealed
row, and the session cookie is a digest of `APP_SECRET`'s fingerprint plus that hash:
changing the password invalidates every cookie at once. The base currency is editable
while the ledger is empty and locked after the first entry.

Uploaded capture artifacts live **outside** the database, under
`DATA_DIR/artifacts/<sha[0:2]>/<sha[2:4]>/<sha256>`: the bytes are gzipped when the
content type is compressible (`text/*`, `application/json`, `application/xml`,
`application/pdf`), encrypted with AES-256-GCM under a key derived from `APP_SECRET`
(HKDF-SHA256, info `spenicle/artifact/v1`), and the plaintext sha is the additional
authenticated data. The `artifacts` row keeps only the metadata, so a deleted file is a
missing document, never a broken capture. The worker reclaims the artifact of a
`rejected` capture once it is older than `ArtifactRetention` (default `720h`, 200 rows
per run) and stamps `deleted_at`, which is what makes the download route answer `410`.
`ArtifactMaxBytes` (default `10 << 20`) is the upload ceiling the API refuses above;
`ArtifactDir` is derived from `DATA_DIR`, so none of the three is an environment
variable.

**Statement import is two-phase, and the file is the client's.** `POST /api/imports`
takes a multipart `file`, a `client_id` (≤ 64) and an optional `account_ref`, parses a
CSV whose header is exactly `occurred_on,amount_minor,description`, and writes a
**draft**: `import_batches` plus one `import_rows` row per line, in one transaction, with
the bytes put through `internal/repository/filestore` and only `file_hash` kept on the
Nothing reaches the ledger until `PATCH /api/imports/{ref}` takes one body action — the
review endpoint is a single route with two actions, not two routes. `commit` posts the
rows the user marked `accepted`, each with `client_id = import:<file_hash>:<row_index>`
and `source = statement`, which is what makes a replayed commit a no-op; `reject` closes
the draft and keeps the evidence, and its optional `reason` (≤ 1000) is stored on the
event, never on the batch row. `import_events` is the append-only log of every
transition — `uploaded`, `resumed`, `conflict_refused`, `row_edited`, `row_accepted`,
`row_skipped`, `committed`, `rejected`, `expired` — written inside the service paths
(`actor = user`) and by the worker GC (`actor = worker`), and read back through
`GET /api/imports/{ref}/events` with the shared envelope. Clash detection runs once, at
upload, and is deterministic: `already_imported` (that row's `client_id` is already in
the ledger), `duplicate` (same day, currency and absolute amount, with a posting on the
batch account), `possible_duplicate` (same amount and currency within 3 days),
`invalid_row` (the line does not parse). A row with any clash defaults to `skipped`;
`PATCH /api/imports/{ref}/rows/{index}` takes absolute values only, so a retry changes
nothing, it bumps `expires_at`, and it stamps `edited_at` once with the accumulated
`edited_fields`. Retention: a `draft` lives `24h` past its last edit and the worker
drops exactly those — rows, blob and one `expired` event, 50 per run — while a
`committed` or `rejected` batch keeps its rows, blob and events forever. `client_id` is
the idempotency key: the same key with the same bytes resumes the draft (`200`), the
same key with different bytes is `409 import_conflict`, replaying the same review action
is `200` with the current batch, and the other action or a row edit on a terminal batch
is `409 import_closed`.

Only these nine are environment variables. **Every other knob — DB path, HTTP
timeouts, shutdown budgets, `/healthz` timeout, request body cap, pool sizes, service
timeouts, shutdown budgets, `/healthz` timeout, request body cap, artifact dir,
retention and size cap, export retention and stale window, pool sizes, service name
(also the tracer name) — has its
default in `internal/common/config/config.go`**, and the
resulting value object is `entity.AppConfig`. No viper, on purpose: eight variables
and one file beat a precedence chain nobody can predict. A new knob means a new
constant and field in those two files, nothing else.

`/healthz` returns `status`, `version` (`<tag>+<sha7>`), `schema_version`,
`app_secret` fingerprint, `base_currency` and `worker_last_run_at` (RFC3339, empty
until the worker finishes a run). The heartbeat is the `worker_last_run_at` row the
worker writes into `settings`, so the `http` process reports it even though it never
runs the worker itself. Use it to prove a running container is the build you think it
is, and that both services are alive.

The way out is a job, not a request. `POST /api/exports` writes a `queued` row and
answers `201`; the worker claims it, renders the ledger through `internal/module/export`
(one JSON document, or a zip of CSV sheets plus `summary.json` and `manifest.json`),
stores the bytes in the same artifact store and marks it `ready`. `GET
/api/exports/{ref}/download` streams that blob and records a `downloaded` event;
`GET /api/exports/{ref}` and `GET /api/exports` are how a client watches the queue.
The document is refs only, no sealed value, and byte-identical for the same data, and
`summary` beside `data` carries the balances, the months and the categories the screen
wants without recomputing them. `export_events` mirrors `import_events`: `queued`,
`resumed`, `started`, `completed`, `failed`, `downloaded`, `expired`, `swept`, with
`actor = user` for the API paths and `actor = worker` for the claim, the sweep and the resume: a job left `running` by a restart is put back to `queued` before the worker claims, with a `resumed` event, so the document is produced instead of being failed. A
`client_id` replay returns the same job (`200`); the same `client_id` with another
`format` is `409 export_conflict`. A `running` job older than `ExportStaleAfter` is
failed (`swept`), and a `ready` job past `ExportRetention` loses its blob and answers
`410 gone` — 20 of each per run. Import is the other half and is not built.

The worker does four things per run, in this order: post the due recurring rules, reclaim
the artifacts of rejected captures, drop expired import drafts, then claim up to 5 export
jobs and sweep the queue.

## Dependencies

Five direct ones, each earning its place: `spf13/cobra` for the CLI (a root command,
`http`, `worker` and the hidden `all`), `go-playground/validator` for the declarative
`validate` tags, `modernc.org/sqlite` as the cgo-free driver, `openai/openai-go` for
the second extraction rail and the `opentelemetry-go` modules for traces and metrics.
`cucumber/godog` and `testcontainers-go` are test-only. A new dependency needs a
reason in the MR, not a `go get`.

## Testing

- Unit tests sit next to the code they test (`internal/entity/money_test.go`,
  `internal/repository/sqlite/store_test.go`). Use `t.Context()`, never
  `context.Background()`.
- UAT is Gherkin via godog, over the **real** handler and a **real** SQLite file in a
  temp dir — no mocks. Steps are generic (`I send a POST to "/api/entries" with:`,
  `the response JSON matches the snapshot "..."`), so a new endpoint usually needs no
  new step. `{{account:Cash}}`, `{{ref}}` and `{{bodyhash}}` expand from the scenario
  so far.
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
  `clearOrder` in `uat/world.go`), `the local cache is cleared` (the rates cache, so
  the next read proves the database fallback), `the connection is broken` (the store
  is closed, so the next call must answer `500 internal_error` with the generic message
  `internal error`, plus `the failure is logged`, `the store holds:` for row counts and
  `the account "Cash" exists as "asset"` for seeds.
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
  `uat/world.go` too. Seeds, schema and first-boot settings live in the adapter
  (`sqlite.EnsureBaseline`), not in a module.

## Where the rest lives

| file | for |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | branches, commits, MR body, ticket shape, review gates |
| [`skills/`](./skills/README.md) | task recipes: release, observability, updates, contribute, ai-integration |
| [`docs/endpoints/`](./docs/endpoints/README.md) | one page per route; same sections everywhere, including the sequence diagram |
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
  mount needs `chown -R 10001:10001 ./data` first. PID 1 is s6-overlay as root; the two
  services drop to `10001` through `s6-setuidgid`, so a file written by one is the same
  owner for the other.
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
  artifact directory in (`DATA_DIR/artifacts`) and the next boot silently records every
  capture as having a document that no longer opens — the row is metadata, the file is
  the document, and nothing cross-checks the two.
- Migrations are embedded and applied on boot (`internal/repository/sqlite/migrations`).
  Five files today (`0001_init.sql`, `0002_artifacts.sql`, `0003_imports.sql`,
  `0004_import_events.sql`, `0005_exports.sql`) and nothing has shipped, so the schema
  is still squashed into a base plus forwards. Once a release exists, forwards
  only — never edit an applied migration, add the next number. The splitter is naive:
  no `;` inside a migration comment.
