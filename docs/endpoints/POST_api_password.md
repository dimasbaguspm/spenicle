# POST /api/password

**Auth.** `Authorization: Bearer <credential>`: the root credential from `POST /api/session`, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or stale credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Replace the generated password with the user's own and clear
`password_must_change`.

## Upstream

The forced change screen after the first sign-in.

## Downstream

`Module.Settings.ChangePassword` → re-seal and upsert `app_settings`.

## Path / query params

None.

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `current_password` | string | yes | verified first |
| `new_password` | string | yes | ≥ 12 characters |

## Response

`{"base_currency":"IDR","timezone":"UTC","password_must_change":false,"extraction_enabled":false,"ai_assistance":false,"token":"<the new root credential>"}`

## Errors

`401 invalid_password` (wrong current, or no password set);
`422 weak_password`; `400 invalid_json`.

## Limitations

No history, no reuse check, no "sign out other devices" — the root credential is derived
from the password hash, so every existing credential dies at once. The response carries the
new one, so the caller replaces its header instead of being locked out.



---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant UI as Client
    participant H as Password handler
    participant S as Settings module
    UI->>H: POST /api/password {current, new}
    H->>S: ChangePassword(current, new)
    S->>S: Authenticate(current)
    alt current wrong
        S-->>H: password does not match
        H-->>UI: 401 invalid_password
    else current ok, new too short
        H-->>UI: 422 weak_password
    else ok
        S->>S: seal new settings JSON
        H-->>UI: 200 settings (must_change false)
    end
```
