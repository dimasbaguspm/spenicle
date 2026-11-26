# POST /api/entries

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Post one balanced entry. The only way money enters the ledger.

## Upstream

Manual entry screen, agents, approvals from captures.

## Downstream

`Module.Ledger.Post`: idempotency lookup by `client_id`, the payee resolution
(`PayeeSource.PayeeByRef`, unknown ref → `404 not_found`), base currency from settings,
rate resolution for a posting that carries no `fx_rate` (`RateSource.Rate`, the
`module/rates` service: the in-memory cache, then `fx_rates` for the exact day, then the
nearest **earlier** day, then a cross rate through EUR), per-posting FX conversion
(`big.Rat`, one rounding; a result outside `int64`, including the int64 floor, is refused),
base-sum balancing (a split-conversion rounding residual goes once to the largest
absolute posting), `entity.NewEntry` (`CheckZeroSum`, which rejects native imbalance and
unrepresentable amounts), then one transaction in
`Repository.Sqlite.InsertEntry` (entry + postings + `audit_log`). Zero-sum is checked again
inside the transaction.

## Path / query params

None.

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `client_id` | string | no | UUIDv7; a replay returns the stored entry |
| `occurred_on` | date | yes | any month, past or future |
| `payee_ref` | ref | no | the payee this entry is for; an unknown ref answers `404 not_found` |
| `note` | string | no | |
| `currency` | string | yes | ISO 4217 of the postings |
| `source` | string | no | defaults to `manual` |
| `postings` | array | yes | ≥ 2, sums to zero |
| `postings[].account_ref` | int | yes | |
| `postings[].amount_minor` | string | yes | signed integer string |
| `postings[].fx_rate` | string | no | an explicit rate always wins; absent, a foreign posting takes the resolved rate and a base posting is `identity` |
| `postings[].fx_rate_date` | string | no | the day the caller used; a resolved posting is stamped with the day the sheet actually carried |

## Response

`201` with the posted entry (`200` when `client_id` replays one already stored). The body
carries `ref`, `occurred_on`, `currency`, `source`, `note`, the postings — each with its
account's `{ref,name,kind}`, its `fx_rate` and its `fx_source` — and, when the entry has a
payee, `payee: {ref, name}`.

`fx_source` says where the rate came from: `identity` on a base-currency posting, `manual`
when the caller sent `fx_rate`, `ecb` when the sheet has that exact day, and `cached` for a
rate carried from the nearest earlier business day or derived as a cross rate.

## Errors

`422 postings_not_balanced`, `422 invalid_postings`, `422 unknown_currency`,
`422 invalid_rate`, `422 invalid_request` (bad date, amount or `payee_ref`),
`404 not_found` when `payee_ref` names no payee, `400 invalid_json`.

## Limitations

An explicit `fx_rate` always wins over the resolver. A foreign entry whose day, and every
earlier day, is missing from the sheet is `422 invalid_rate`: the ledger does not guess a
future rate, and with no sheet at all (no vendor configured) every foreign entry still
needs its own `fx_rate`. After posting, only the payee
(`PATCH /api/entries/{ref}`) can change; anything else is void plus re-post.



---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Entries handler
    participant L as Ledger module
    participant S as Settings module
    participant R as Rates module
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
    opt posting has no fx_rate and the entry is foreign
        L->>R: Rate(native, base, occurred_on)
        R->>DB: cache, then fx_rates at or before the day
        alt no direct pair
            L->>R: Rate(EUR, base) and Rate(EUR, native)
            R-->>L: two legs, crossed as eurToBase / eurToNative
        end
        R-->>L: rate, day used, source (ecb | cached)
    end
    L->>L: convert each posting (big.Rat, one rounding)
    L->>L: CheckZeroSum(native, base)
    L->>DB: BEGIN; INSERT entry; INSERT postings; INSERT audit; COMMIT
    L-->>H: entry, created=true
    H-->>C: 201 entry
```
