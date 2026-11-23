# POST /api/entries

**Auth.** Session cookie (`spenicle_session`). Open mode passes everything through; with a password set, a missing or stale cookie is `401 unauthorized`.

## Purpose

Post one balanced entry. The only way money enters the ledger.

## Upstream

Manual entry screen, agents, approvals from captures.

## Downstream

`Module.Ledger.Post`: idempotency lookup by `client_id`, base currency
from settings, per-posting FX conversion (`big.Rat`, one rounding), `entity.NewEntry`
(`CheckZeroSum`), then one transaction in `Repository.Sqlite.InsertEntry` (entry +
postings + `audit_log`). Zero-sum is checked again inside the transaction.

## Path / query params

None.

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `client_id` | string | no | UUIDv7; a replay returns the stored entry |
| `occurred_on` | date | yes | any month, past or future |
| `payee_id` | int | no | |
| `note` | string | no | |
| `currency` | string | yes | ISO 4217 of the postings |
| `source` | string | no | defaults to `manual` |
| `postings` | array | yes | ≥ 2, sums to zero |
| `postings[].account_ref` | int | yes | |
| `postings[].amount_minor` | string | yes | signed integer string |
| `postings[].fx_rate` | string | no | required when `currency` ≠ base |
| `postings[].fx_rate_date` | string | no | |

## Response

created,

## Errors

`422 postings_not_balanced`, `422 invalid_postings`, `422 unknown_currency`,
`422 invalid_rate`, `422 invalid_request` (bad date or amount), `400 invalid_json`.

## Limitations

No automatic rate resolution yet: the ledger does not read `fx_rates`,
so a foreign entry must send `fx_rate` (the system scrapes the ECB sheet at boot and keeps it in memory). No field edits after posting (void and re-post). No payee validation.



---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Entries handler
    participant L as Ledger module
    participant S as Settings module
    participant DB as SQLite
    C->>H: POST /api/entries {currency, postings, client_id}
    H->>H: parse amounts (minor units as strings)
    H->>L: Post(input)
    opt client_id present
        L->>DB: SELECT entry WHERE client_id = ?
        alt replay
            L-->>H: stored entry, created=false
            H-->>C: 200 existing entry
        end
    end
    L->>S: BaseCurrency()
    L->>L: convert each posting (big.Rat, one rounding)
    L->>L: CheckZeroSum(native, base)
    L->>DB: BEGIN; INSERT entry; INSERT postings; INSERT audit; COMMIT
    L-->>H: entry, created=true
    H-->>C: 201 entry
```
