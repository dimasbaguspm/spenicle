# PATCH /api/recurring/{ref}

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Steer a rule without recreating it: correct the amount, change the cadence, push the
next due date, or move its state — accept, pause, end.

## Upstream

The recurring screen ("pause", "correct amount"), the review queue for a suggested rule.

## Downstream

`RecurringByRef` (joins payees and accounts so refs come back intact), then
`UpdateRecurring`: one transaction that `UPDATE`s the schedule columns and `state` and
appends an `audit_log` `update` row.

## Path / query params

| name | type | required | notes |
| --- | --- | --- | --- |
| `ref` | string | yes | the rule's dashless UUID |

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `amount_minor` | string | no | integer minor units |
| `cadence` | string | no | `daily`, `weekly`, `monthly`, `yearly` |
| `next_due_on` | string | no | `YYYY-MM-DD`; may push or rewind an explicit schedule |
| `interval_n` | int | no | 1–52 |
| `day_of_month` | int | no | 1–31 |
| `ends_on` | string | no | `YYYY-MM-DD` |
| `state` | string | no | `suggested`, `active`, `paused`, `ended` |

## Response

**200** the rule, same shape as `POST /api/recurring`.

## Errors

`404 not_found` for an unknown rule; `422 invalid_request` for an unknown cadence or
state, an out-of-range interval/day, or a malformed date.

## Limitations

State changes are not guarded: `ended` back to `active` is accepted. The update and its
`audit_log` `update` row are written in one transaction. Payee, account and category are
immutable after creation — a rule that moved to a different account is a new rule.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Recurring handler
    participant DB as SQLite
    C->>H: PATCH /api/recurring/{ref} {state?, amount_minor?, cadence?, …}
    H->>DB: SELECT recurring_rules JOIN payees/accounts WHERE r.ref = ?
    alt no row
        H-->>C: 404 not_found
    else row
        H->>DB: UPDATE recurring_rules SET schedule, state; INSERT audit update; COMMIT
        H-->>C: 200 rule
    end
```
