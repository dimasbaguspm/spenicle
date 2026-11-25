# F1 — Open the instance, then keep it closed

**Status** live · **Client** first-run wizard, sign-in screen, token screen, audit drawer
**Routes** `GET /healthz` · `POST /api/setup` · `GET /api/settings` · `GET /api/meta` · `POST /api/password` · `POST /api/tokens` · `GET /api/tokens` · `POST /api/tokens/{ref}/revoke` · `GET /api/audit` · `GET /api/connections` · `POST /api/connections/google` · `GET /api/connections/google/callback` · `POST /api/connections/{ref}/revoke`

## 1. The job the user has

"I just started a container. Tell me it is alive, let me choose my currency, then make
sure nobody else can read my spending." Later, the same screen answers "which device
still has a credential?" and "who voided that entry?".

## 2. Client journeys (multi-hit by design)

### 2.1 First run

| # | call | why it cannot be skipped |
| --- | --- | --- |
| 1 | `GET /healthz` | proves the process booted, migrated, and which build this is |
| 2 | `GET /api/settings` | `base_currency`, `timezone`, `password_must_change`, and the capability flags: `extraction_enabled` drives SnapToJSON; `ai_assistance` is informational only and must not gate a feature ([F9](./09-gaps-and-next.md) G11) |
| 3 | `POST /api/setup {"base_currency":"IDR","accounts":[{"name":"Cash","kind":"asset","opening_balance_minor":"500000"}]}` | the wizard's only write; optional opening balances post atomically, then `200` returns the settings payload |
| 4 | `POST /api/password {current_password, new_password}` | closes the instance; the response carries the new root credential |
| 5 | `GET /api/meta` | one round trip fills the shell: settings, accounts with balances, the ISO currency list |

Step 1 and step 2 are separate on purpose: `/healthz` is public and answers even when
the credential is wrong, so a client can distinguish "server down" from "server says no".

Step 3 is `admin`-scoped but not root-only, so a token minted with `admin` can do it —
the wizard normally runs in open mode, before any credential exists.

Step 4 is the one call that invalidates every credential at once: the root credential
is derived from the password hash, so the token in the response is the client's new
header value. Store it only after the response arrived; a client that pre-writes it
locks itself out.

### 2.2 Issue a credential for an agent

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/tokens` | root-only; shows `preview` (`spl_ab12…9f3c`), `scopes`, `last_used_at`, `revoked_at` |
| 2 | `POST /api/tokens {"name":"iphone-shortcut","scopes":["captures:write","dashboard:read"]}` | `201` with `token` — the plaintext exists in this response and nowhere else |
| 3 | later: `GET /api/tokens?status=active&used=used` | the listing filters on `last_used_at`, so an unused token is visible |
| 4 | `POST /api/tokens/{ref}/revoke` | `200` with `revoked_at`; the row and its journal entry stay |

A token can never mint another token: `/api/tokens*`, `/api/password`,
`PATCH /api/settings`, `/api/intake*` and `/api/connections*` live in the root-only
mux, so a token reaching them gets `403 forbidden` with "this route needs the root
credential".

Scope vocabulary (a token carries 1–20 of these; `admin` and `*` cover every scoped
route): `entries:read|write`, `captures:read|write`, `accounts:read|write`,
`payees:read|write`, `recurring:read|write`, `imports:read|write`,
`exports:read|write`, `analytics:read`, `audit:read`, `dashboard:read`,
`settings:read`, `rates:read`, `categorization:read|write`.

### 2.3 Authorise the mailbox (Google rail)

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/connections` | `{"provider":"google","status":"disconnected"}` until one exists |
| 2 | `POST /api/connections/google {client_id, client_secret, redirect_url}` | `201 {authorize_url, state}`; the client opens `authorize_url` |
| 3 | `GET /api/connections/google/callback?code&state` | the provider redirect lands here; answers the connection (`account`, `scopes`, `access_expires_at`) |
| 4 | `POST /api/connections/{ref}/revoke` | stamps `revoked_at`; the row stays, the credential stops working |

`status` is `active` or `reauth_required`; a provider refusal during refresh surfaces on
every intake call as `409 reauth_required` until the user authorises again.

### 2.4 Read the journal

`GET /api/audit?entity_kind=ledger_entry&entity_ref=<ref>` — one append-only row per
state change, filters `entity_kind`, `entity_ref`, `action`, `actor_kind`, `from`, `to`,
plus the shared cursor/limit. `actor_ref` names the token when a token made the change;
`from`/`to` are JSON objects, omitted when the change carried no payload.

## 3. Backend, end to end

```
GET /healthz        Handler.Health      → Repository.Sqlite.SchemaVersion + Ping
POST /api/setup     Handler.Setup       → Module.Settings.Setup (one-shot guard, opening entries, re-seal)
GET /api/meta       Handler.Meta.Get    → Settings.Load + ListAccounts + BalancesByAccount + entity.Currencies()
POST /api/password  Handler.Session.ChangePassword → Module.Settings.ChangePassword (PBKDF2, re-seal)
POST /api/tokens    Handler.Tokens.Create → Module.Tokens.Create (sealer.Digest, InsertToken + journal)
GET /api/audit      Handler.Audit.List  → Repository.Sqlite.ListAudit
```

- **Settings are one sealed row.** `entity.Settings` is AES-256-GCM under `APP_SECRET`;
  changing the secret is refused at boot (`settings.secret_fingerprint` mismatch), so
  the API can never serve a half-decrypted instance.
- **Nothing is a stored fact twice.** `base_currency` is here, `timezone` is here, the
  worker heartbeat (`worker_last_run_at`) is here — `/healthz` reads them, it does not
  cache them.
- **The password is the root credential.** `module/settings.Root` verifies the PBKDF2
  hash (600k rounds) and caches the digest in memory keyed by the stored hash, so a
  rotation invalidates the cache by construction and the first verify after a restart
  is the slow one.
- **A token is a digest.** Only `HMAC-SHA256(APP_SECRET-derived key, "spenicle/token/v1\0"+token)`
  is stored, plus the masked preview. The identity middleware stamps `last_used_at`
  on every authenticated request, which is why the listing can filter `used|never`.
- **Journal in the same transaction.** Every account/payee/rule/entry/capture/token/
  setting change appends its `audit_log` row inside the write transaction
  (`sqlite.appendAudit`). A client reading the audit does not need to reconcile: the
  journal cannot be missing a change that happened, or hold one that rolled back.
- **Boot order is a contract.** `config.Start` loads config (fails without
  `APP_SECRET`), opens SQLite (WAL retry, `busy_timeout`), migrates, seals, loads
  settings, then `EnsureBaseline` (fingerprint check, seed `Cash` + `Unsorted`,
  generated password on a fresh database). If any step fails the process exits instead
  of serving a half-ready API, so `/healthz` answering `ok` means all of it happened.

## 4. RRR

### Requirements

1. A cold container must answer `GET /healthz` before anything else is asked of it, and
   must answer `ok` only after migrations, sealing and the baseline seeds succeeded.
2. `POST /api/setup` succeeds exactly once. The completion marker locks the base
   currency even when the ledger is empty; a legacy database with entries is also locked.
   Voiding entries does not unlock it. Optional opening balances commit with that marker.
3. `timezone` is never writable through the API. It comes from `APP_TIMEZONE` at the
   first boot; a later boot that disagrees with the stored value refuses to start.
4. `GET /api/settings` always carries `base_currency`, `timezone`,
   `password_must_change`, `extraction_enabled` and `ai_assistance` — no `omitempty`,
   so a client never guesses a default. `extraction_enabled` is the flag that matters:
   it says SnapToJSON is wired. `ai_assistance` is computed from the `OPENAI_*`
   variables but the OpenAI adapter is reserved for the future chat endpoint
   ([F9](./09-gaps-and-next.md) G11), so a client must not gate a feature on it.
5. A token's plaintext is returned by its creating `201` and by nothing else, ever.
6. Revoking is idempotent in effect: a second revoke is `404`, and every request
   carrying the revoked secret answers `401` from then on.
7. Root-only routes stay unreachable from a token, so escalation is impossible by
   construction.
8. Every state change on the journaled tables appends one audit row in its own
   transaction; the journal is readable but never writable by a client.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| a client keeps the *old* password after rotation | every request starts answering `401 invalid_password` → "unauthorized" | `POST /api/password` returns the new root credential in the same body; the client must replace its header before it paints the success screen |
| open mode reaches a public host | until a password is set, every request is root; `POST /api/setup` and `POST /api/password` are the only gates | the fresh boot prints the generated password once, `password_must_change` is in every settings payload, and the rollout checklist in the [README](./README.md) treats `true` as a blocker |
| token sprawl | a leaked shortcut token can dump receipts | scopes are a closed set, `captures:write` alone cannot read the ledger, `last_used_at` makes an unused token visible, and revoke keeps the row so the history is intact |
| password is the only root credential | no "sign out other devices" | rotation kills every derived credential at once; this is the design, and the client must not present a per-device session model |
| OAuth callback is a public route | the provider redirect carries no bearer header, so the route skips auth entirely | the `state` value is validated against the pending authorisation (`401 invalid_state` on mismatch or replay); the client must not reuse a `state` |
| `GET /api/meta` has no payees and no rules | a client that bootstraps from meta alone has no pickers | call `GET /api/payees` and `GET /api/recurring` for those screens; or use meta for the first paint and fetch on demand |

### Rollout

1. **Ship the wizard first.** `healthz` → `settings` → `setup` → `password` is the
   smallest client that is safe to expose; it needs no other route.
2. **Then the token screen.** It is root-only, so it can ship after the wizard without
   touching agent tokens that do not exist yet.
3. **Do not ship a client that writes `base_currency` outside setup.** `PATCH
   /api/settings` refuses unknown fields and `{}` with `422 empty_patch`: the route
   exists to answer "nothing is patchable yet", not to be used.
4. Roll back by pinning the previous image tag; the schema is forward-only, and no
   route in this page writes a destructive migration.

## 5. Acceptance criteria

```gherkin
Scenario: A cold instance is healthy before it is used
  Given a running API with migrations applied
  When I send a GET to "/healthz"
  Then the response status is 200
  And the response JSON matches the snapshot "healthz"

Scenario: The base currency is chosen once
  Given an empty ledger
  When I send a POST to "/api/setup" with:
    """json
    {"base_currency":"USD"}
    """
  Then the response status is 200
  And the response body has base_currency "USD"
  When I send a POST to "/api/setup" with:
    """json
    {"base_currency":"EUR"}
    """
  Then the response status is 409
  And the error code is "base_currency_locked"

Scenario: Opening balances land with the currency lock
  Given an empty ledger
  When I send a POST to "/api/setup" with:
    """json
    {"base_currency":"USD","accounts":[
      {"name":"Bank","kind":"asset","opening_balance_minor":"500000"},
      {"name":"Card","kind":"liability","opening_balance_minor":"-75000"}
    ]}
    """
  Then the response status is 200
  And the store holds 2 "ledger_entries" rows
  And the account "Bank" carries base_amount_minor "500000"
  And the account "Card" carries base_amount_minor "-75000"

Scenario: A weak password is refused and a good one rotates the root credential
  Given the instance password is "generated-password"
  When I sign in with the instance password
  And I send a POST to "/api/password" with:
    """json
    {"current_password":"generated-password","new_password":"short"}
    """
  Then the response status is 422
  And the error code is "weak_password"
  When I send a POST to "/api/password" with:
    """json
    {"current_password":"generated-password","new_password":"a-longer-secret-2026"}
    """
  Then the response status is 200
  And the response body carries a "token" I can use as the next bearer credential

Scenario: A token is issued once and cannot mint another
  When I sign in with the instance password
  And I send a POST to "/api/tokens" with:
    """json
    {"name":"iphone-shortcut","scopes":["captures:write","dashboard:read"]}
    """
  Then the response status is 201
  And the response body carries "token"
  When I use the issued token as the bearer credential
  And I send a POST to "/api/tokens" with:
    """json
    {"name":"escalation","scopes":["*"]}
    """
  Then the response status is 403
  And the error code is "forbidden"

Scenario: A revoked token stops answering at once and stays in the listing
  When I sign in with the instance password
  And I create a token "shortcut"
  And I revoke the token "shortcut"
  Then the response status is 200
  And the response body carries "revoked_at"
  When I use the revoked token as the bearer credential
  And I send a GET to "/api/dashboard"
  Then the response status is 401
  And the error code is "unauthorized"
  When I sign in with the instance password
  And I send a GET to "/api/tokens?status=revoked"
  Then the listing still carries the token "shortcut"

Scenario: A token without the scope is refused by name
  When I create a token with scopes "captures:write"
  And I use it to send a GET to "/api/entries"
  Then the response status is 403
  And the error message names "entries:read"
```

## 6. What this page does not promise

- No password history, no reuse check, no per-device sign-out.
- No token expiry and no per-token rate limit (both are open questions in
  [`../../endpoints/planned.md`](../../endpoints/planned.md)).
- No `PATCH /api/settings`: every body it receives is refused, by design.
- No `PATCH /api/accounts/{ref}` for `kind`; reparenting and the roll-up ship in [F4](./04-accounts-and-payees.md).
