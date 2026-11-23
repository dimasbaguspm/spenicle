# PATCH /api/entries/{ref}

**Auth.** Session cookie (`spenicle_session`). Open mode passes everything through; with a password set, a missing or stale cookie is `401 unauthorized`.

## Purpose

Two separate corrections, one at a time: void the entry, or set (or clear) its payee.
Voiding never deletes — it writes the compensating entry and stamps `voided_at` on the
original, in one transaction.

## Upstream

Ledger screen ("I logged this twice", "this was Kopi Kenangan, not the supermarket").

## Downstream

`{"void": true}` → `Module.Ledger.Void` → `Repository.Sqlite.VoidEntry`: read the
original, negate every posting, insert the reversal with `reverses_entry_id`, `UPDATE …
voided_at WHERE voided_at IS NULL`, insert `audit_log` action `void`.

`{"payee_ref": "…"}` → `Module.Ledger.UpdatePayee` → `Repository.Sqlite.UpdateEntryPayee`:
resolve the payee through `PayeeSource.PayeeByRef`, `UPDATE ledger_entries SET payee_id`,
insert `audit_log` action `update` on `ledger_entries`, then reload the entry with its
postings.

## Path / query params

`ref` (32-hex ref, required).

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `void` | bool | one of the two | must be `true` |
| `payee_ref` | ref | one of the two | `""` clears the payee; an unknown ref is `404 not_found` |
| `reason` | string | no | becomes the reversal's note |

The two actions never travel together. A body that sends neither `void` nor `payee_ref`
is refused, and so is a body that sends both:

| body | status | code | message |
| --- | --- | --- | --- |
| `{"void":true,"reason":"duplicate"}` | `200` | — | the reversal entry |
| `{"payee_ref":"<32 hex>"}` | `200` | — | the entry, now carrying `payee{ref,name}` |
| `{"payee_ref":""}` | `200` | — | the entry, without `payee` |
| `{"reason":"nothing"}` | `422` | `invalid_request` | `send {"void": true} or {"payee_ref": "..."}` |
| `{"void":true,"payee_ref":"<32 hex>"}` | `422` | `invalid_request` | `void and payee_ref are separate actions` |
| `{"void":false}` | `422` | `unsupported_patch` | `only {"void": true} is supported today` |

## Response

`200` with the full entry: `ref`, `occurred_on`, `currency`, `source`, `note`, the
postings, `voided_at` on the reversal, and `payee: {ref, name}` whenever the entry has a
payee. The body is the same shape `GET /api/entries` returns per row.

## Errors

`404 not_found` (unknown entry or unknown `payee_ref`); `409 invalid_state` (already
voided); `422 invalid_request` (no action, both actions, a `{ref}` or `payee_ref` that is
not a 32-hex ref); `422 unsupported_patch` for `{"void": false}`; `400 invalid_json`.

## Limitations

The note is not editable; void and re-post remains the correction for everything except
the payee. `voided_at` is not serialised in listings yet; the reversal row is the
evidence.



---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Entries handler
    participant L as Ledger module
    participant DB as SQLite
    C->>H: PATCH /api/entries/{ref} {void:true, reason} or {payee_ref}
    alt void
        H->>L: Void(ref, reason)
        L->>DB: SELECT entry + postings
        alt missing
            H-->>C: 404 not_found
        end
        L->>DB: BEGIN
        L->>DB: UPDATE ledger_entries SET voided_at WHERE id=? AND voided_at IS NULL
        alt already voided
            L->>DB: ROLLBACK
            H-->>C: 409 invalid_state
        else
            L->>DB: INSERT reversal entry (reverses_entry_id)
            L->>DB: INSERT negated postings
            L->>DB: INSERT audit_log action=void
            L->>DB: COMMIT
            H-->>C: 200 reversal entry
        end
    else payee
        H->>L: UpdatePayee(ref, payee_ref)
        L->>DB: SELECT payee WHERE ref=?
        alt unknown payee
            H-->>C: 404 not_found
        end
        L->>DB: BEGIN; UPDATE ledger_entries SET payee_id; INSERT audit_log action=update; COMMIT
        L->>DB: SELECT entry + postings
        H-->>C: 200 entry with payee
    end
```
