# POST /api/recurring

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Record a rule that repeats: rent every month on the 1st, a subscription every year, a
weekly allowance. The rule is a plan, not a posting — nothing reaches the ledger until
a due date is materialised.

## Upstream

"Make this recurring" on an entry, the recurring screen, an agent that noticed the same
merchant three months running.

## Downstream

`Repository.Sqlite.CreateRecurring`: resolves `payee_ref` and the account refs, then one
`recurring_rules` row with `origin = user` and `state = active`.

## Path / query params

None.

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `payee_ref` | string | yes | who gets paid |
| `account_ref` | string | yes | where the money leaves from |
| `category_ref` | string | no | the `expense`/`income` account it lands in |
| `amount_minor` | string | yes | integer minor units, signed |
| `currency` | string | yes | ISO 4217 |
| `cadence` | string | yes | `daily`, `weekly`, `monthly`, `yearly` |
| `interval_n` | int | no | every N cadences, default 1 |
| `day_of_month` | int | no | 1–31, for monthly rules |
| `business_day_shift` | string | no | `none` (default), `next`, `prev` |
| `next_due_on` | string | yes | `YYYY-MM-DD` |
| `ends_on` | string | no | `YYYY-MM-DD` |

## Response

**201** the rule: `ref`, both refs, `amount_minor`, `cadence`, `interval_n`,
`day_of_month`, `business_day_shift`, `next_due_on`, `ends_on`, `origin: user`,
`state: active`, `created_at`.

## Errors

`422 invalid_request` for an unknown cadence, shift, a `day_of_month` outside 1–31 or a
malformed date; `422 unknown_currency` for a `currency` this build does not know;
`404 not_found` when `payee_ref` or an account ref does not exist.

## Limitations

Nothing posts to the ledger by itself, but the schedule does run: `spenicle worker` queues
a `captures` row for every occurrence whose `next_due_on` has arrived — the dedupe key is
the rule plus the due date, so a rerun never double-queues — then `UPDATE`s
`next_due_on`/`last_posted_on` and appends an `advance` journal row, up to `catchUpCap`
occurrences per rule per run. Approving the capture is still what writes the entry. No
`detected` origin either — that is the promotion path from a capture.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Recurring handler
    participant DB as SQLite
    C->>H: POST /api/recurring {payee_ref, account_ref, cadence, next_due_on, …}
    H->>H: validate tags, default interval 1 and shift none
    H->>DB: SELECT payees, accounts by ref
    alt unknown ref
        H-->>C: 404 not_found
    else known
        H->>DB: INSERT recurring_rules (ref, ids, cadence, state=active, …)
        H-->>C: 201 rule
    end
```
