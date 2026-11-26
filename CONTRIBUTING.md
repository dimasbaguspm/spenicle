# Contributing

Spenicle is a single-user project with a strict shape. This document is the short
version of how to send a change that will be accepted. The long version of "why"
lives in [`AGENTS.md`](./AGENTS.md) and [`docs/v2-design.md`](./docs/v2-design.md);
if they disagree with this file, they win.

Read [`LICENSE`](./LICENSE) first. It is source-available, not open source: you may
run an unmodified copy personally, you may not redistribute it or use it
commercially. Sending a contribution means you accept the contribution terms in
that file.

## Before you write code

```bash
mise install                  # go, golangci-lint, lefthook; once per clone
cp .env.example .env          # fill APP_SECRET
make hooks                    # git hook: build + lint + test + UAT before every commit
make test                     # unit + integration tests, must be green before and after
make uat                      # Gherkin suite, separate from unit tests
make lint                     # four groups, all must stay at 0 issues
make run                      # http://localhost:8080/healthz
```

Versions come from `mise.toml`: Go from `go.mod`, `golangci-lint` from CI and
[`lefthook`](https://github.com/evilmartians/lefthook) for the hooks. The hook is the same
four checks CI runs; `git commit --no-verify` skips it, and CI will not.

Requirements: those tools, Docker if you touch the image. No node, no backend package
manager.

## What a change must respect

1. **Double-entry.** ≥ 2 postings, native and base sums both zero.
2. **No user-record deletes.** Void or reject; every state change appends to
   `audit_log`, except token usage stamps, worker heartbeats and boot seeds.
   Derived balances and expired imports are pruned.
3. **Money is integers.** Minor units + ISO code, rates as `TEXT` + `big.Rat`, one
   rounding step, never `float64`.
4. **Capture ≠ ledger.** A capture never posts on its own.
5. **Two supervised processes, one SQLite file.** No Postgres, Redis, queue or
   sidecar.
6. **Boundaries take `ctx` first and open one span**, named for the layer:
   `Repository.Sqlite.InsertEntry`, `Module.Ledger.Post`, `Handler.Entries.Post`.
7. **Every knob** goes in `internal/common/config/config.go` with a default and a
   field on `entity.AppConfig`. No new env var without both.
8. **Every directory keeps its root interface file** (`repository.go`, `ledger.go`,
   `entity.go`, `uat.go`). A new adapter is a new implementation, not a new call site.

## Branch and commit

Branches: `feat/<short-slug>`, `fix/<short-slug>`, `docs/<short-slug>`,
`chore/<short-slug>`. Never commit to `main` directly while a review is open.

Commits are Conventional Commits, one logical change each, imperative subject,
no body unless a fact cannot fit the subject:

```
feat: require APP_SECRET and refuse a mismatched one on boot
fix: flush telemetry after the signal cancels the context
docs: link every commit in the release notes
```

A breaking change gets `!` (`refactor!: rename SNAPTOJSON_API_KEY to EXTRACTION_API_KEY …`) plus one line
saying what an operator must do.

## The merge request

Title mirrors the commit subject. Body answers four questions, in this order:

```markdown
## What
One paragraph: the behaviour that changes.

## Why
The problem, or the design decision it implements.

## How
The shape of the change — files, layers, trade-offs worth a reviewer's attention.

## Checks
- [ ] `make test`
- [ ] `make uat`
- [ ] `make lint` (four groups, 0 issues)
- [ ] `/healthz` smoke run if the wiring changed
- [ ] docs updated (`AGENTS.md`, `docs/`, `.env.example`) when a rule moved
```

Rules for review:

- Keep it reviewable: one concern per MR. A refactor plus a feature is two MRs.
- No drive-by formatting, no unrelated renames, no lint silencing without a reason
  string in a `//nolint`.
- Every new endpoint gets a Gherkin scenario in `uat/features/`; the steps are
  generic, so a new endpoint usually needs no new step. Add a snapshot assertion for
  the wire shape (`the response JSON matches the snapshot "…"`) and for the rows it
  writes (`the database matches the snapshot "…"`), then run
  `UAT_UPDATE_SNAPSHOTS=1 go test ./uat/` once and review the new files.
- If you change a rule in `docs/v2-design.md`, change the doc in the same MR.

## Tickets

Issues are vertical slices, not layers. A ticket that says "add repository layer"
is wrong; "post an entry with a foreign rate and see the base amount derived" is
right. Use this shape:

```markdown
## Context
One paragraph of why this exists.

## Scope
- bullet list of what changes, observable from outside the process

## Out of scope
- what a reviewer should not expect

## Definition of done
- [ ] behaviour proven by a test (unit or Gherkin)
- [ ] lint groups still 0 issues
- [ ] docs touched if a rule moved
```

## Where to look next

| file | for |
| --- | --- |
| [`AGENTS.md`](./AGENTS.md) | the operating manual: invariants, layout, commands, traps |
| [`skills/`](./skills/README.md) | task recipes: release, observability, updates, agent integration |
| [`docs/v2-design.md`](./docs/v2-design.md) | locked decisions and the schema |
| [`docs/endpoints/README.md`](./docs/endpoints/README.md) | every implemented route: purpose, params, body, limits, sequence |
| [`docs/v2-api.md`](./docs/v2-api.md) | target endpoints, DDL, error codes |
| [`docs/linting.md`](./docs/linting.md) | why lint is four configs |
| [`docs/releasing.md`](./docs/releasing.md) | the tag-only release path |
