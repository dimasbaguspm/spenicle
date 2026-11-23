# POST /api/setup

**Auth.** Session cookie (`spenicle_session`). Open mode passes everything through; with a password set, a missing or stale cookie is `401 unauthorized`.

## Purpose

Open the ledger: choose the base currency before the first entry. It is a one-shot
wizard step — the same call answers `409` the moment the ledger has any entry.

## Upstream

The first-run screen.

## Downstream

`Module.Settings.SetBaseCurrency`: `HasEntries` guard, then re-seal the settings row.

## Path / query params

None.

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `base_currency` | string | yes | ISO 4217, case-insensitive; `empty_setup` when absent |

## Response

**200** `{"base_currency":"USD","password_must_change":false,"extraction_enabled":false}`

## Errors

`422 empty_setup` when the body carries nothing; `409 base_currency_locked` once an
entry exists; `422 unknown_currency` for a code this build does not know.

## Limitations

Only the currency: first account and opening balance are not part of this route yet, and
the base currency cannot be changed afterwards (voiding entries does not unlock it).

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Setup handler
    participant S as Settings module
    participant DB as SQLite
    C->>H: POST /api/setup {base_currency}
    H->>S: SetBaseCurrency(code)
    S->>DB: SELECT EXISTS(ledger_entries)
    alt ledger has entries
        H-->>C: 409 base_currency_locked
    else empty
        S->>DB: UPDATE settings (re-sealed)
        H-->>C: 200 settings
    end
```
