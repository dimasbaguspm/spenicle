# Spenicle v2 — README

A self-hosted expense tracker for one person who does not want to keep a spreadsheet.
One container, one SQLite file, one binary with two supervised processes. Built so that
a missed week does not become a quit.

Built and covered by UAT: setup and settings, auth (instance password, scoped tokens,
Google connections), accounts, payees, recurring rules, entries, captures with
artifacts, categorization rules, statement imports, exports, rates, audit, dashboard,
analytics, intake and health — see [`docs/endpoints/`](./docs/endpoints/README.md).
Design: [`docs/v2-design.md`](./docs/v2-design.md). Schema and target API: [`docs/v2-api.md`](./docs/v2-api.md). Implemented endpoints: [`docs/endpoints/`](./docs/endpoints/README.md). Lint groups: [`docs/linting.md`](./docs/linting.md). Releasing: [`docs/releasing.md`](./docs/releasing.md). Working on the code: [`AGENTS.md`](./AGENTS.md) and [`skills/`](./skills/README.md). Sending a change: [`CONTRIBUTING.md`](./CONTRIBUTING.md). Docs checked against the code, with the commit and the release verdict: [`docs/alignment.md`](./docs/alignment.md).

Licence: source-available, not open source — personal use of an unmodified copy,
no redistribution, no commercial use. See [`LICENSE`](./LICENSE).

## Why v2

v1 asked too much. Three containers to boot, five decisions to log a coffee, and no place to
put a decision you did not feel like making. v2 changes three things:

1. **Capture is separate from organizing.** Logging takes 2 seconds and one number. Categorizing
   happens later, in a queue you clear in five minutes.
2. **Setup is one command.** SQLite, no Postgres, no Redis, no JWT.
3. **User records are never deleted.** Reverse and reject instead, with an audit trail;
   derived balances and expired imports are pruned.

## Install

```bash
docker run -d --name spenicle \
  -p 8080:8080 \
  -v spenicle-data:/data \
  -e APP_SECRET="$(openssl rand -base64 32)" \
  ghcr.io/dimasbaguspm/spenicle:latest
```

Then open `http://localhost:8080`. Migrations run on boot, and the container log carries
the generated first password once — sign in with it and pick your own.

The image runs two supervised processes from the same environment: `spenicle http`
(the API, the only listener, on `:8080`) and `spenicle worker` (recurring capture
staging, reclaiming the artifacts of rejected captures, expired import draft and stale
upload GC, export claim/render/sweep, the mailbox intake poll and the heartbeat stamp,
no port). Neither the listen address nor the data directory is configurable — the
container works in `/data`, which is the volume. Inside the container `sv status
/etc/service/spenicle-worker` reports either one, `sv restart spenicle-worker` restarts
it alone and a `down` file next to its `run` script keeps it stopped. A
one-shot debug run skips supervision: `docker run --rm --entrypoint /spenicle -e
APP_SECRET=… <image> worker`.

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

volumes:
  spenicle-data:
```

The container starts `runsvdir` as root (that is what supervises the two services) and
both run scripts drop to uid `10001` through `chpst`. A **named volume** (above) inherits the
right ownership automatically. If you prefer a bind mount for easier backups, give the
host directory to that uid first:

```bash
sudo chown -R 10001:10001 ./data
```

## Environment

| var | default | meaning |
| --- | --- | --- |
| `APP_TIMEZONE` | `UTC` | IANA timezone for every calendar decision; set once, at the first boot |
| `APP_SECRET` | **required** | ≥ 16 bytes; seals the settings row and encrypts stored blobs; identifies the database |
| `SNAPTOJSON_API_KEY` | unset | enables receipt/statement extraction through SnapToJSON |
| `SNAPTOJSON_ENDPOINT` | vendor route | overrides the SnapToJSON partner route for a proxy or a staging account |
| `OPENAI_API_KEY` | unset | **reserved**: extraction never uses it, because `config.SelectRail` never builds the OpenAI adapter |
| `OPENAI_MODEL` | `gpt-4o-mini` | model the reserved OpenAI adapter asks for |
| `OPENAI_HOST` | unset | base URL for the reserved OpenAI adapter; empty keeps the SDK default |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | unset | OTLP/HTTP collector; HTTPS assumed, `http://` for plaintext |

`APP_SECRET` is required: the process refuses to boot without it, and refuses to
boot when it does not match the database it is opening. Generate one once and keep
it with your backups:

```bash
openssl rand -base64 32
```

Every variable is listed with defaults in [`.env.example`](./.env.example); copy it
to `.env` and fill in `APP_SECRET`.

The base currency and the login password are **not** environment variables. They live
in the app's settings table: a fresh boot generates the first password and prints it
once, the login screen accepts it, and you are asked to change it. The base currency
is chosen once by `POST /api/setup`, which can also create accounts with opening
balances. Completing setup locks it, even with an empty ledger. `PATCH /api/settings` refuses it.

## First run

The wizard asks for the base currency and can create accounts with their opening
balances in the same call. Each nonzero balance posts a double-entry `adjustment`
against an `Opening balance` equity account; currency-only setup is also valid.

Base currency is locked when setup completes. Changing it later would rewrite
history, and history is the only thing worth protecting here.

## Daily loop

1. **Capture** — share a bank notification or a receipt photo to Spenicle, or tap the quick-add
   button. Amount only. Nothing else is required, and nothing is lost if you are offline.
2. **Review** — once a week, open the queue. Each card arrives prefilled with the extracted
   amount, payee and category. Approve with one tap, or reject with a reason.
3. **Look** — the dashboard returns the window totals, the month series, the pending
   capture count and the top category; `GET /api/analytics/months` returns spend, income and
   net per month. The month report — expected against tracked, split into unlogged spend, FX
   movement, price changes and rounding — is planned, not shipped.

Recurring bills (rent, subscriptions) also land in the queue as cards. Nothing posts itself.

## Backups

Back up four things, together:

```bash
docker stop spenicle
tar czf spenicle-$(date +%F).tar.gz -C ./data spenicle.db artifacts/ exports/ imports/
docker start spenicle
```

The database, the `artifacts/`, `exports/` and `imports/` directories, and **the
`APP_SECRET` value**. Without the secret, sealed settings, receipt images, raw bank
text and exports are unrecoverable; your ledger and balances still open normally
with `sqlite3`. That asymmetry is deliberate.

## Agents and scripts

Every screen uses the same HTTP API an agent would. Create a token in settings, scoped to what the
agent needs:

```bash
curl -s http://localhost:8080/api/tokens \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <instance-password>' \
  -d '{"name":"laptop-agent","scopes":["captures:write","dashboard:read"]}'
```

```bash
# an agent dumping a receipt
curl -X POST http://localhost:8080/api/captures \
  -H "Authorization: Bearer spl_..." \
  -F kind=image -F file=@receipt.jpg

# and reading what it may spend
curl 'http://localhost:8080/api/dashboard?from=2026-02-01&to=2026-02-28' -H "Authorization: Bearer spl_..."
```

That agent can add captures and read the dashboard. It cannot touch the ledger. Give it
`entries:write` only if you actually want it writing money movements.

## What it is not

- Not multi-user. One person, one ledger.
- Not a bank integration. No bank credentials, no scraping. Google OAuth connects a
  mail inbox for receipt intake; it is not a bank link.
- Not multi-currency accounts. Foreign currency is a property of a transaction; accounts settle in
  your base currency.
- Not a budgeting app with envelopes. It answers "can I spend this today", not "you have Rp 400k
  left in Groceries".

## Troubleshooting

| symptom | cause |
| --- | --- |
| `SNAPTOJSON_API_KEY` env is unset | extraction stays off; captures are typed by hand — set it to enable the vendor |
| container exits with `app secret mismatch` | `APP_SECRET` differs from the one that sealed this database. Restore the original secret. If it is gone for good, start over: stop the container, delete `spenicle.db`, boot again — the ledger you keep is the one you backed up |
| `/healthz` returns 503 | schema query, database ping or settings read failed; a secret mismatch stops boot before the API serves |
| captures stay `pending` with no draft | extraction is disabled (no API key); typing the fields works fine |
| no share target on iPhone | iOS Safari has none; use a Shortcut that POSTs to `/api/captures` |
| a month looks short of what you spent | nothing derives the gap yet: the month report (unlogged spend, FX movement, price changes, rounding) is planned, and `GET /api/analytics/months` returns ledger totals only — capture the missing spend |
