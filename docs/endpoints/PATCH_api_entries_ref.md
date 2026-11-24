# PATCH /api/entries/{ref}

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Three corrections, one at a time: void the entry, set (or clear) its payee, or correct
it — the date, the note, or the postings — which voids the original and posts the
replacement in the same transaction. Nothing is ever deleted.

## Upstream

Ledger screen ("I logged this twice", "this was Kopi Kenangan, not the supermarket",
"that coffee was 20 000, not 18 000").

## Downstream

`{"void": true}` → `Module.Ledger.Void` → `Repository.Sqlite.VoidEntry`: read the
original, negate every posting, insert the reversal with `reverses_entry_id`, `UPDATE …
voided_at WHERE voided_at IS NULL`, insert `audit_log` action `void`.

`{"payee_ref": "…"}` → `Module.Ledger.UpdatePayee` → `Repository.Sqlite.UpdateEntryPayee`:
resolve the payee through `PayeeSource.PayeeByRef`, `UPDATE ledger_entries SET payee_id`,
insert `audit_log` action `update` on `ledger_entries`, then reload the entry with its
postings.

`{"occurred_on"|"note"|"postings"}` → `Module.Ledger.Correct` → `Repository.Sqlite.ReplaceEntry`
in one transaction: stamp `voided_at` on the original, insert the reversal, insert the
replacement (source `adjustment`, same currency and payee, the corrected date/note and
the postings you sent, rebuilt through the normal zero-sum and FX path), and append the
`void` and `create` audit rows.

## Path / query params

`ref` (32-hex ref, required).

## Body

| field | type | required | notes |
| --- | --- | --- | --- |
| `void` | bool | one action | must be `true` |
| `payee_ref` | ref | one action | `""` clears the payee; an unknown ref is `404 not_found` |
| `occurred_on` | date | one action | the corrected date |
| `note` | string | one action | ≤ 2000; `""` clears it |
| `postings` | array | optional with a correction | ≥ 2, sums to zero; omitted keeps the original amounts |
| `reason` | string | no | the reversal's note |

Exactly one action per request. A body that sends none, or two, is refused:

| body | status | code | message |
| --- | --- | --- | --- |
| `{"void":true,"reason":"duplicate"}` | `200` | — | the reversal entry |
| `{"payee_ref":"<32 hex>"}` | `200` | — | the entry, now carrying `payee{ref,name}` |
| `{"payee_ref":""}` | `200` | — | the entry, without `payee` |
| `{"note":"coffee and a bun"}` | `200` | — | the replacement entry (a reversal pair is written) |
| `{"occurred_on":"2026-02-15","postings":[…]}` | `200` | — | the replacement entry with the new date |
| `{"reason":"nothing"}` | `422` | `invalid_request` | `send {"void": true}, {"payee_ref": "..."} or the corrected occurred_on/note/postings` |
| `{"void":true,"note":"both"}` | `422` | `invalid_request` | `void, payee_ref and a correction are separate actions` |
| `{"void":false}` | `422` | `unsupported_patch` | `only {"void": true} is supported today` |

## Response

`200` with the full entry: `ref`, `occurred_on`, `currency`, `source`, `note`, the
postings, `payee: {ref, name}` when the entry has one. `void` answers the reversal; a
correction answers the replacement (`source: "adjustment"`).

## Errors

`404 not_found` (unknown entry or unknown `payee_ref`); `409 invalid_state` (already
voided, for both a second void and a correction); `422 invalid_request` (no action, more
than one action, a `{ref}` or `payee_ref` that is not 32 hex, an unbalanced posting set);
`422 postings_not_balanced`, `422 invalid_postings`, `422 unknown_currency`,
`422 invalid_rate` from the ledger; `422 unsupported_patch` for `{"void": false}`;
`400 invalid_json`.

## Limitations

A correction is never an in-place edit: it writes a reversal pair, so three rows exist
after one correction and the store keeps the history. Sending `postings` re-derives the
base amounts with the rates you send; omitting them reuses the original amounts and
rates. A correction on a voided entry is `409`, and re-posting is the way forward.

---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Entries handler
    participant L as Ledger module
    participant DB as SQLite
    C->>H: PATCH /api/entries/{ref} {void|payee_ref|occurred_on,note,postings}
    alt void
        H->>L: Void(ref, reason)
        L->>DB: BEGIN; UPDATE voided_at WHERE NULL; INSERT reversal + audit; COMMIT
        H-->>C: 200 reversal
    else payee
        H->>L: UpdatePayee(ref, payee_ref)
        L->>DB: BEGIN; UPDATE payee_id; INSERT audit; COMMIT
        H-->>C: 200 entry
    else correction
        H->>L: Correct(ref, occurred_on?, note?, postings?)
        L->>L: rebuild postings, CheckZeroSum
        L->>DB: BEGIN; UPDATE voided_at; INSERT reversal; INSERT replacement + audit; COMMIT
        H-->>C: 200 replacement
    end
```
