# GET /api/bootstrap

**Auth.** None. This is a public route in the public mux: no `Authorization` header is read and no credential is resolved.

## Purpose

The one read a client needs before it holds a credential: it says whether the instance
has been claimed yet. `false` means the setup screen, `true` means the sign-in screen.

## Upstream

The first screen of a fresh instance, and any client that wants to know which mode the
instance is in before it asks for a password.

## Downstream

`Module.Settings.Load` → the sealed `settings` row, and `Repository.Sqlite.Setting` → the
`setup_completed_at` row. No account, no entry, no payee and no secret is read.

## Path / query params

None.

## Body

None.

## Response

`{"setup_completed":false,"base_currency":"IDR","timezone":"UTC","extraction_enabled":false,"ai_assistance":false}`

## Errors

`500 internal_error` when the settings row or the `setup_completed_at` row cannot be
read; the body is the generic message and the cause goes to the log.

## Limitations

It is a mode, not a secret, and it is deliberately narrow: no account, no amount, no
credential. `setup_completed: false` also means the instance is **open** — a fresh
database has no password until [`POST /api/setup`](./POST_api_setup.md) sets one, so
anyone who can reach the port can claim it. That window is documented, not hidden:
start the container on a trusted network or claim it before exposing the port.
`setup_completed` is `false` on a database that has entries but never completed setup
too — a legacy instance, whose base currency is locked anyway. `base_currency` before
setup is the default (`IDR`), so a client must not treat it as the chosen one while
`setup_completed` is `false`.



---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant UI as Client
    participant H as Bootstrap handler
    participant S as Settings module
    participant R as Sqlite store
    UI->>H: GET /api/bootstrap
    H->>S: Load()
    S-->>H: settings (base_currency, timezone)
    H->>R: Setting(setup_completed_at)
    R-->>H: found or absent
    H-->>UI: 200 setup_completed, base_currency, timezone, flags
```
