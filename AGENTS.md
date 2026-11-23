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
7. **Single process, single file.** No Postgres, no Redis, no queue, no sidecar.
   Adding infrastructure needs a design-doc change first.

## Layout

```
cmd/http/              main.go · bootstrap.go (composition root; owns the wiring)
cmd/http/handlers/     route table + one file per endpoint group
cmd/http/middlewares/  recovery, span per request, structured request log
uat/                   godog suite: uat.go, steps.go, world.go, features/
internal/common/       no business logic: config, clock, seal, otel, httpx
internal/constant/     every fixed value shared by more than one package
internal/entity/       shared structs + invariants; imports stdlib + constant only
internal/module/       business logic: ledger, captures, rates, settings
internal/repository/   contracts, plus the adapters: sqlite, ecb, extraction/{snaptojson,openai}
```

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
  `context.Background()`, in `cmd/http/main.go`, wrapped in `signal.NotifyContext`;
  everything derives from it. Pure value code (`entity` validation, `clock`) takes no
  context and opens no span.

## Commands

```bash
make hooks      # install the git hook (build + lint + test + UAT before commit)
make build      # bin/spenicle
make run        # DATA_DIR=./data ADDR=:8080 go run ./cmd/http
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

Only these nine are environment variables. **Every other knob — DB path, HTTP
timeouts, shutdown budgets, `/healthz` timeout, request body cap, pool sizes, service
name (also the tracer name) — has its default in `internal/common/config/config.go`**, and the
resulting value object is `entity.AppConfig`. No viper, on purpose: eight variables
and one file beat a precedence chain nobody can predict. A new knob means a new
constant and field in those two files, nothing else.

`/healthz` returns `status`, `version` (`<tag>+<sha7>`), `schema_version`,
`app_secret` fingerprint and `base_currency`. Use it to prove a running process is
the build you think it is.

## Testing

- Unit tests sit next to the code they test (`internal/entity/money_test.go`,
  `internal/repository/sqlite/store_test.go`). Use `t.Context()`, never
  `context.Background()`.
- UAT is Gherkin via godog, over the **real** handler and a **real** SQLite file in a
  temp dir — no mocks. Steps are generic (`I send a POST to "/api/entries" with:`,
  `the response JSON at $.postings[0].amount_minor is "-15000"`), so a new endpoint
  usually needs no new step. `{{account:Cash}}` placeholders expand to the id created
  earlier in the scenario.
- Snapshots: `the response JSON matches the snapshot "x"` compares
  `uat/snapshots/api/x.json`; `the database matches the snapshot "x"` dumps the
  allow-listed tables to `uat/snapshots/db/x.json`. Timestamps, sealed envelopes, the
  build version and the secret fingerprint are normalised. A missing snapshot is
  written and fails the step; `UAT_UPDATE_SNAPSHOTS=1` (`make uat-snapshots`) rewrites
  them on purpose.
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

- Repetition goes in `Scenario Outline` + `Examples` (`uat/features/contract.feature`).
- External services are the only things mocked, and they are Go programs under
  `uat/mock/`: one container serves the SnapToJSON partner route and the ECB daily
  sheet. `uat/mock_test.go` starts it through testcontainers in `TestMain` and hands
  the base URL to the Gherkin suite (`uat.Options`) and to the adapter tests. No Docker
  means those tests skip.
- `uat` assembles the dependency graph by hand because `cmd/http` is `package main`
  and therefore not importable. Adding a dependency to `cmd/http/bootstrap.go` means
  adding it to `uat/world.go` too. Seeds, schema and first-boot settings live in the
  adapter (`sqlite.EnsureBaseline`), not in a module.

## Where the rest lives

| file | for |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | branches, commits, MR body, ticket shape, review gates |
| [`skills/`](./skills/README.md) | task recipes: release, observability, updates, contribute, ai-integration |
| [`docs/endpoints.md`](./docs/endpoints.md) | every implemented route: purpose, upstream/downstream, params, body, limitations, sequence |
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
it becomes `resource.service.name` and the tracer name. Span names are
layer-qualified (`Repository.Sqlite.InsertEntry`) and opened directly with
`telemetry.StartSpan` — never through a local wrapper. Details and failure modes:
[`skills/observability`](./skills/observability/SKILL.md).

## Known traps

- `docker run` as uid `10001`: use a **named volume** (`-v spenicle-data:/data`). A bind
  mount needs `chown -R 10001:10001 ./data` first.
- The telemetry flush uses `context.WithoutCancel`; the signal that stops the process
  already cancelled the root context, and without this the last span batch is lost.
- `golangci-lint` `dupword --fix` has silently eaten SQL (`NULL` removed from a
  `VALUES` list) and `golines` flattened raw SQL into escaped one-liners. Both are
  removed from the lint configs; do not re-add them.
- `internal/common/otel` is package `telemetry` (import alias) so it does not shadow
  `go.opentelemetry.io/otel`.
- Migrations are embedded and applied on boot (`internal/repository/sqlite/migrations`).
  One file today (`0001_init.sql`): nothing has shipped, so the schema is squashed. Once
  a release exists, forwards only — never edit an applied migration, add the next number.
