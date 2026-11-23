# Spenicle v2 — README

A self-hosted expense tracker for one person who does not want to keep a spreadsheet.
One container, one file, one command. Built so that a missed week does not become a quit.

Not yet built — this is the target the implementation is measured against.
Design: [`docs/v2-design.md`](./docs/v2-design.md). Schema and API: [`docs/v2-api.md`](./docs/v2-api.md). Lint groups: [`docs/linting.md`](./docs/linting.md). Releasing: [`docs/releasing.md`](./docs/releasing.md). Working on the code: [`AGENTS.md`](./AGENTS.md).

## Why v2

v1 asked too much. Three containers to boot, five decisions to log a coffee, and no place to
put a decision you did not feel like making. v2 changes three things:

1. **Capture is separate from organizing.** Logging takes 2 seconds and one number. Categorizing
   happens later, in a queue you clear in five minutes.
2. **Setup is one command.** SQLite, no Postgres, no Redis, no JWT.
3. **Nothing is ever deleted.** Void and reject instead, with an audit trail.

## Install

```bash
docker run -d --name spenicle \
  -p 8080:8080 \
  -v spenicle-data:/data \
  -e APP_SECRET="$(openssl rand -base64 32)" \
  -e PASSWORD="your-password" \
  ghcr.io/dimasbaguspm/spenicle:latest
```

Then open `http://localhost:8080`. Migrations run on boot; there is no migration step.

Releases are container images only — there are no binary downloads. Pin a specific
release by tag (`:v0.2.0`) or by digest (`@sha256:…`) from its release notes.

With compose:

```yaml
services:
  spenicle:
    image: ghcr.io/dimasbaguspm/spenicle:latest
    restart: unless-stopped
    ports: ["8080:8080"]
    volumes: ["spenicle-data:/data"]
    environment:
      APP_SECRET: "paste-a-32-byte-secret"
      PASSWORD: "your-password"

volumes:
  spenicle-data:
```

The container runs as uid `10001`, not root. A **named volume** (above) inherits the
right ownership automatically. If you prefer a bind mount for easier backups, give the
host directory to that uid first:

```bash
sudo chown -R 10001:10001 ./data
```

## Environment

| var | default | meaning |
| --- | --- | --- |
| `DATA_DIR` | `/data` | SQLite file and `raw/` artifacts |
| `PASSWORD` | unset | enables the login screen; unset means open on your LAN |
| `APP_SECRET` | **required** | ≥ 16 bytes; seals capture payloads, artifacts and cookies |
| `APP_SECRET_RESET` | `false` | recovery: start despite a changed secret, discarding sealed payloads |
| `SNAPTOJSON_API_KEY` | unset | enables receipt/statement extraction through SnapToJSON |

`APP_SECRET` is required: the process refuses to boot without it, and refuses to
boot when it does not match the database it is opening. Generate one once and keep
it with your backups:

```bash
openssl rand -base64 32
```

Set `PASSWORD` if the instance is reachable from anywhere except your own bed.

## First run

The wizard asks three things: base currency, your first account and its opening balance. It seeds
a category tree you can rename later. That is the entire setup — no bank connection, no import
required.

Base currency is locked after the first transaction. Changing it later would rewrite history,
and history is the only thing worth protecting here.

## Daily loop

1. **Capture** — share a bank notification or a receipt photo to Spenicle, or tap the quick-add
   button. Amount only. Nothing else is required, and nothing is lost if you are offline.
2. **Review** — once a week, open the queue. Each card arrives prefilled with the extracted
   amount, payee and category. Approve with one tap, or reject with a reason.
3. **Look** — the dashboard answers one question: how much can I spend today without breaking
   the month. The month report shows what you expected, what you tracked, and the gap between
   them, already split into unlogged spend, FX movement, price changes and rounding.

Recurring bills (rent, subscriptions) also land in the queue as cards. Nothing posts itself.

## Backups

Back up three things, together:

```bash
docker stop spenicle
tar czf spenicle-$(date +%F).tar.gz -C ./data spenicle.db raw/
docker start spenicle
```

The database, the `raw/` directory, and **the `APP_SECRET` value**. Without the secret,
receipt images and raw bank text are unrecoverable; your ledger and balances still open normally
with `sqlite3`. That asymmetry is deliberate.

## Agents and scripts

Every screen uses the same HTTP API an agent would. Create a token in settings, scoped to what the
agent needs:

```bash
curl -s http://localhost:8080/api/tokens \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"name":"laptop-agent","scopes":["captures:write","dashboard:read"]}'
```

```bash
# an agent dumping a receipt
curl -X POST http://localhost:8080/api/captures \
  -H "Authorization: Bearer spn_..." \
  -F kind=image -F file=@receipt.jpg

# and reading what it may spend
curl http://localhost:8080/api/dashboard -H "Authorization: Bearer spn_..."
```

That agent can add captures and read the dashboard. It cannot touch the ledger. Give it
`entries:write` only if you actually want it writing money movements.

## What it is not

- Not multi-user. One person, one ledger.
- Not a bank integration. No credentials, no scraping, no OAuth.
- Not multi-currency accounts. Foreign currency is a property of a transaction; accounts settle in
  your base currency.
- Not a budgeting app with envelopes. It answers "can I spend this today", not "you have Rp 400k
  left in Groceries".

## Troubleshooting

| symptom | cause |
| --- | --- |
| container exits with `app secret mismatch` | `APP_SECRET` differs from the one that sealed this database. Restore the original secret. If it is gone for good, set `APP_SECRET_RESET=true` once: the ledger survives, every sealed capture payload is discarded and the reset is written to `audit_log` |
| `/healthz` returns 503 | database not writable, or secret fingerprint mismatch |
| captures stay `pending` with no draft | extraction is disabled (no API key); typing the fields works fine |
| no share target on iPhone | iOS Safari has none; use a Shortcut that POSTs to `/api/captures` |
| month report shows a large `unlogged` bucket | spending not yet captured; the response includes an adjustment body you can post |
