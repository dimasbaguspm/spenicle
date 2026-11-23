---
name: contribute
description: Send a change to Spenicle: branch, commit, merge request and ticket conventions, plus the gates a reviewer will check.
---

# Contribute

Canonical doc: [`CONTRIBUTING.md`](../../CONTRIBUTING.md). This skill is the
checklist; the doc explains the reasoning.

## 0. Licence

The repository is **source-available**: personal use of an unmodified copy only, no
redistribution, no commercial use. Sending a change grants the copyright holder a
licence to use it. If that is not acceptable, don't send the change.

## 1. Branch

```bash
git checkout main && git pull
git checkout -b feat/entry-void      # or fix/, docs/, chore/
```

One concern per branch. A refactor plus a feature is two branches.

## 2. Commit

Conventional Commits, imperative, one logical change, no body unless an operator
must be told something:

```
feat: require APP_SECRET and refuse a mismatched one on boot
fix: flush telemetry after the signal cancels the context
refactor!: rename EXTRACTION_API_KEY to SNAPTOJSON_API_KEY
```

`!` marks a breaking change and the body says what a deployment must do. Never a
file path or a ticket number in the subject.

## 3. Gates (run before pushing)

```bash
make hooks     # once per clone: lefthook runs build + lint + test + UAT on commit
make fmt
make test      # unit + UAT over the real handler and a real SQLite file
make lint      # correctness, style, security, performance — 0 issues each
```

The hook is a convenience, not the gate: CI runs the same commands on a runner. If you
skip it with `--no-verify`, run them by hand before pushing.

Also, when the change touches wiring or behaviour:

```bash
docker build -t spenicle:local .
docker run --rm -e APP_SECRET=0123456789abcdef -p 8080:8080 spenicle:local &
curl -s localhost:8080/healthz
```

A new endpoint needs a scenario in `uat/features/`; the steps are generic
(`I send a POST to "/api/entries" with:`), so usually no new step is needed. Pin the
contract with snapshots — `the response JSON matches the snapshot "x"` and
`the database matches the snapshot "x"` — then regenerate once:

```bash
UAT_UPDATE_SNAPSHOTS=1 make test   # or: make uat-snapshots
```

Review the written files before committing; they are the contract now.

## 4. Merge request

Title mirrors the subject. Body: **What → Why → How → Checks**, with the checklist
from `CONTRIBUTING.md`. Rules a reviewer applies:

- Does it break an invariant? (double-entry, no deletes, integer money, capture ≠
  ledger, single process)
- Does every new boundary method take `ctx` first and open exactly one
  `telemetry.StartSpan` with a layer-qualified name?
- Did a knob get added to `internal/common/config/config.go` (default) **and**
  `entity.AppConfig` (field) **and** `.env.example`?
- Is the new package's root file the only thing a caller needs to read?
- Do the docs move with the rule? (`AGENTS.md`, `docs/`, `skills/`)

Approval is not a formality: a green CI plus a reviewed diff, or it waits.

## 5. Ticket shape

Vertical slice, not layer. Use:

```markdown
## Context
## Scope        (observable from outside the process)
## Out of scope
## Definition of done   (test + lint + docs)
```

Good: "post an entry with a foreign rate and see the base amount derived".
Bad: "add a repository layer".

## Done means

- CI green on the branch (build + test, four lint jobs)
- MR body has the four sections and the checklist
- no unrelated file in the diff
- docs updated in the same MR when a rule moved
