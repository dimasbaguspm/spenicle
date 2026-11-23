# POST /api/password

**Auth.** Session cookie (`spenicle_session`). Open mode passes everything through; with a password set, a missing or stale cookie is `401 unauthorized`.

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

`{"base_currency":"IDR","password_must_change":false,"extraction_enabled":false,"ai_assistance":false}`

## Errors

`401 invalid_password` (wrong current, or no password set);
`422 weak_password`; `400 invalid_json`.

## Limitations

No history, no reuse check, no "sign out other devices" — the new hash
is folded into the cookie, so every existing session dies at once. The response sets a
fresh cookie for the caller.



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
