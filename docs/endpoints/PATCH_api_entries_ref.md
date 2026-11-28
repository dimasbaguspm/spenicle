# PATCH /api/entries/{ref}

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Four corrections, one at a time: reverse the entry, set (or clear) its payee, **amend** it
(the day and the note, edited in place) or **correct** it (the postings you send, which reverses
the original and posts the replacement). Moving money is a reversal; moving the text is not.
Nothing is ever deleted.

## Upstream

Ledger screen ("I logged this twice", "this was Kopi Kenangan, not the supermarket",
"that coffee was 20 000, not 18 000").

## Downstream

`{"reverse": true}` → `Module.Ledger.Reverse` → `Repository.Sqlite.ReverseEntry`: read the
original, build and validate its full reversal before opening the write transaction
(an original containing the int64 floor is `422 invalid_postings` and writes nothing),
then negate every posting, insert the reversal with `reversal_of_ref`, `UPDATE …
reversed_at WHERE reversed_at IS NULL`, insert `audit_log` action `reverse`.

`{"payee_ref": "…"}` → `Module.Ledger.UpdatePayee` → `Repository.Sqlite.UpdateEntryPayee`:
resolve the payee through `PayeeSource.PayeeByRef`, `UPDATE entries SET payee_ref`,
insert `audit_log` action `update` on `entries`, then reload the entry with its
postings.

`{"occurred_on"|"note"}` with no `postings` → `Module.Ledger.Amend` →
`Repository.Sqlite.AmendEntry`: `UPDATE entries SET occurred_on, note WHERE reversed_at IS NULL`,
mark the accounts that touch the entry `balance_dirty` (the day decides where the row sits in every
running balance), and append one `audit_log` row, action `update`, with the before and after as
`entry_details`. The row keeps its ref, its postings and its money: this is an edit, not a
reversal, and `reversed_at` stays null.

`{"postings": [...]}` → `Module.Ledger.Correct` → `Repository.Sqlite.ReplaceEntry` in one
transaction: stamp `reversed_at` on the original, insert the reversal, insert the replacement
(source `adjustment`, same currency and payee, the corrected date/note and the postings you sent,
rebuilt through the normal zero-sum and FX path), and append the `reverse` and `create` audit rows.
The replacement carries `reversal_of_ref` and the original carries `reversed_by_ref`, so the chain
is readable from either end.

## Path / query params

`ref` (32-hex ref, required).

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `reverse` | bool | one action | must be `true` |
| `payee_ref` | ref | one action | `""` clears the payee; an unknown ref is `404 not_found` |
| `occurred_on` | date | one action | the corrected date |
| `note` | string | one action | ≤ 2000; `""` clears it |
| `postings` | array | optional with a correction | ≥ 2, sums to zero; omitted keeps the original amounts |
| `reason` | string | no | the reversal's note |

Exactly one action per request. A body that sends none, or two, is refused:

| body | status | code | message |
| --- | --- | --- | --- |
| `{"reverse":true,"reason":"duplicate"}` | `200` | — | the reversal entry |
| `{"payee_ref":"<32 hex>"}` | `200` | — | the entry, now carrying `payee{ref,name}` |
| `{"payee_ref":""}` | `200` | — | the entry, without `payee` |
| `{"note":"coffee and a bun"}` | `200` | — | the replacement entry (a reversal pair is written) |
| `{"occurred_on":"2026-02-15","postings":[…]}` | `200` | — | the replacement entry with the new date |
| `{"reason":"nothing"}` | `422` | `invalid_request` | `send {"reverse": true}, {"payee_ref": "..."} or the corrected occurred_on/note/postings` |
| `{"reverse":true,"note":"both"}` | `422` | `invalid_request` | `reverse, payee_ref and a correction are separate actions` |
| `{"reverse":false}` | `422` | `unsupported_patch` | `only {"reverse": true} is supported today` |

## Response

`200` with the full entry: `ref`, `occurred_on`, `currency`, `source`, `note`, the
postings, `payee: {ref, name}` when the entry has one. `reverse` answers the reversal; a
correction answers the replacement (`source: "adjustment"`).

## Errors

`404 not_found` (unknown entry or unknown `payee_ref`); `409 invalid_state` (already
reversed, for both a second reverse and a correction); `422 invalid_request` (no action, more
than one action, a `{ref}` or `payee_ref` that is not 32 hex); `422 postings_not_balanced`
when the posting set does not sum to zero, `422 invalid_postings`, `422 unknown_currency`,
`422 invalid_rate` from the ledger; `422 unsupported_patch` for `{"reverse": false}`;
`400 invalid_json`.

## Limitations

A correction is never an in-place edit: it writes a reversal pair, so three rows exist
after one correction and the store keeps the history. Sending `postings` re-derives the
base amounts with the rates you send; omitting them reuses the original amounts and
rates. A correction on a reversed entry is `409`, and re-posting is the way forward.

---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Entries handler
    participant L as Ledger module
    participant DB as SQLite
    C->>H: PATCH /api/entries/{ref} {reverse|payee_ref|occurred_on,note,postings}
    alt reverse
        H->>L: Reverse(ref, reason)
        L->>DB: BEGIN; UPDATE reversed_at WHERE NULL; INSERT reversal + audit; COMMIT
        H-->>C: 200 reversal
    else payee
        H->>L: UpdatePayee(ref, payee_ref)
        L->>DB: BEGIN; UPDATE payee_ref; INSERT audit; COMMIT
        H-->>C: 200 entry
    else correction
        H->>L: Correct(ref, occurred_on?, note?, postings?)
        L->>L: rebuild postings, CheckZeroSum
        L->>DB: BEGIN; UPDATE reversed_at; INSERT reversal; INSERT replacement + audit; COMMIT
        H-->>C: 200 replacement
    end
```
