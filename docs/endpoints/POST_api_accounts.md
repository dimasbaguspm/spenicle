# POST /api/accounts

**Auth.** `Authorization: Bearer <credential>`: the root credential from `POST /api/session`, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or stale credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Create an account or a category. A category is not a table: it is an account whose
`kind` is `expense` or `income`, so the whole chart of accounts is one collection and
every posting target has one shape.

## Upstream

The setup wizard, the "add account" sheet, an agent seeding defaults.

## Downstream

`Repository.Sqlite.CreateAccount`: one `accounts` row with a fresh UUIDv7 `ref`, then
the handler answers. No ledger entry is written here — an account with 0 balance is a
normal state; only an opening balance (a future `POST /api/setup`) posts.

## Path / query params

None.

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `name` | string | yes | ≤ 80 characters; unique per `kind` |
| `kind` | string | yes | `asset`, `liability`, `expense`, `income` |
| `currency` | string | no | ISO 4217; defaults to the base currency |

## Response

**201** `{"ref":"…","name":"Groceries","kind":"expense","currency":"IDR","archived":false}`

`ref` is the only identifier the client keeps: every request that mentions an account
sends this value.

## Errors

`422 invalid_request` when `name` is missing or `kind` is not one of the four;
`422 unknown_currency` for a code this build does not know.

## Limitations

No parent, icon or opening balance in this route yet — use `PATCH /api/accounts/{ref}`
to rename, add an icon or archive. A duplicate `name`+`kind` pair is refused by the
unique index (a `500` today, not a friendly `409`).

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Accounts handler
    participant DB as SQLite
    C->>H: POST /api/accounts {name, kind, currency?}
    H->>H: validate tags, default currency = base
    H->>DB: INSERT accounts (ref, name, kind, currency, created_at)
    DB-->>H: id
    H-->>C: 201 {ref, name, kind, currency, archived:false}
```
