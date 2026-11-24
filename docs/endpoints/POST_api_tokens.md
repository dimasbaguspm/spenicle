# POST /api/tokens

**Auth.** **Root session only.** A token can never mint another token: this route has no
scope in `routeScopes`, so a Bearer credential answers `403 forbidden`.

## Purpose

Mint a named, scoped, non-root credential for an agent, a shortcut or a cron job.

## Upstream

The settings screen, or `curl` carrying the root credential.

## Downstream

`Module.Tokens.Create`: trim the name, validate every scope against the closed set
(`entity.KnownScope`), generate 32 random bytes, `sealer.Digest` the plaintext, then
`Repository.Sqlite.InsertToken` in one transaction (row + journal `api_token/create`, actor
`user`).

## Path / query params

None.

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `name` | string | yes | 1–100 characters, `iphone-shortcut` |
| `scopes` | string[] | yes | 1–20 entries from the documented scope table; `admin` and `*` cover every scoped route |

## Response

`201` with `ref`, `name`, `preview` (`spl_ab12…9f3c`), `scopes`, `created_at` and
**`token`** — the plaintext, returned here and nowhere else, ever.

## Errors

`422 invalid_request` for an empty name, an empty scope list and an unknown scope (a typo is
refused rather than stored), `400 invalid_json` for an unknown field, `403 forbidden` when a
token tries it.

## Limitations

No expiry: a token lives until `POST /api/tokens/{ref}/revoke`. `last_used_at` is stamped by
the identity middleware on every authenticated request, not here.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (root)
    participant H as Tokens handler
    participant T as Tokens module
    participant DB as SQLite
    C->>H: POST /api/tokens {name, scopes}
    H->>H: bindBody (unknown fields refused) + validate scopes
    H->>T: Create({name, scopes})
    T->>T: 32 random bytes, plaintext = "spl_…"
    T->>DB: BEGIN; INSERT api_tokens(token_hash = HMAC(secret, plain), scopes); journal; COMMIT
    T-->>H: token, plaintext
    H-->>C: 201 {ref, name, scopes, created_at, token}
```
