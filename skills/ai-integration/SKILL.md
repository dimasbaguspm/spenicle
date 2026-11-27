---
name: ai-integration
description: Point an agent, script or editor at a running Spenicle instance or at this repository, using its documented contracts instead of guesswork.
---

# AI / agent integration

Two directions: an agent **using** a running instance, and an agent **working on**
this repository. Both are constrained on purpose.

## A. Working on the repository

1. Read [`AGENTS.md`](../../AGENTS.md) first — invariants, layout, commands, traps.
   It is the map; skills are the step-by-step.
2. Load the matching skill: [`release`](../release/SKILL.md),
   [`observability`](../observability/SKILL.md),
   [`updates`](../updates/SKILL.md), [`contribute`](../contribute/SKILL.md).
3. Never invent an invariant. If a change seems to need one broken, the design doc
   changes first ([`docs/v2-design.md`](../../docs/v2-design.md)).
4. Prove it: `make test`, `make lint`, and a `/healthz` smoke run when wiring moved.
5. Report what was verified and what was not. "Should work" is not a result.

Editor wiring (any MCP/agent host): expose the repo root, point the tool at
`AGENTS.md`, and add `skills/` to its instruction folder. No credentials are needed
to read or test the repository: tests build their own SQLite file in a temp dir.

## B. Using a running instance

The HTTP API is the integration point; there is no plugin, no sidecar client.

```bash
# liveness and identity — the first call any agent should make
curl -s http://localhost:8080/healthz
# {"status":"ok","version":"v0.1.1+<sha7>","schema_version":1,
#  "app_secret":"<fingerprint>","base_currency":"IDR"}

# one balanced entry, idempotent on client_id
curl -s -X POST http://localhost:8080/api/entries \
  -H 'Content-Type: application/json' \
  -d '{"client_id":"3f1c…","occurred_on":"2026-02-14","currency":"IDR",
       "note":"coffee",
       "postings":[{"account_id":1,"amount_minor":"-25000"},
                   {"account_id":2,"amount_minor":"25000"}]}'
```

Rules an agent must respect:

1. **Money is integer strings** in minor units (`"-25000"`), never floats, never
   `"25.00"`. The currency code carries the minor-unit convention (IDR 0, USD 2).
2. **Postings must sum to zero** natively and in base currency; the server rejects
   anything else with `422 postings_not_balanced`.
3. **Always send `client_id`** (UUIDv7). A retry then returns `200` with the stored
   entry instead of posting twice.
4. **Capture ≠ ledger.** An agent may create `captures`; only an explicit approval
   creates an entry.
5. **No deletes.** Reverse an entry; the server appends to `audit_log`.
6. **Base currency is locked.** Do not attempt to change it via the API.

Endpoints, error codes and DDL: [`docs/v2-api.md`](../../docs/v2-api.md). The API is
still being built; treat a missing endpoint as "not yet", never as "call the database
directly".

## C. Local instance for an agent to drive

```bash
cp .env.example .env  # set APP_SECRET
make run              # listens on :8080, migrations and seeds run on boot
curl -s localhost:8080/healthz
```

A scratch database is the safe way to experiment: run the binary from an empty directory
(`cd "$(mktemp -d)" && /path/to/spenicle all`) so its `./data` lands there — a fresh file,
seeded with `Cash` and `Unsorted` accounts.

## Done means

- the agent read `AGENTS.md` before writing code, or `/healthz` before writing data
- every write carries `client_id` and balances to zero
- the change was verified (`make test` + `make lint`, or the endpoint's real
  response), and the report says which checks ran
