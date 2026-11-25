# PATCH /api/captures/{ref}

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying `captures:write` plus the scope for the action. `approve` also needs `entries:write` for the entry it posts, and `payees:write` when `payee_ref` enables learning; `match` also needs `entries:read` for the entry it reads. `reject` and `retry` need only `captures:write`. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a missing action scope is `403 forbidden` before the downstream call.

## Purpose

Resolve a queue item with one action: `approve` posts an entry, `reject` discards it
with a reason, `retry` re-reads the vendor job, `match` links it to an entry that is
already in the ledger.

## Upstream

Review screen; the vendor reading a snap back.

## Downstream

`approve` → `Module.Captures.Approve` → `PayeeSource.PayeeByRef` when `payee_ref` is set →
`Module.Ledger.Build` (the same zero-sum and FX path as `POST /api/entries`, with
`source` derived from the capture kind) → `Repository.Sqlite.Approve`. The repository
rechecks the zero sum, then inserts the entry and its postings, stamps the capture
`approved` with `resolved_entry_ref`, and appends the entry and capture audit rows in
one transaction, so no failed approval leaves an orphan entry. A `kind='recurring'`
capture also resolves `recurring_rule_id` from its draft, so
`(recurring_rule_id, occurred_on)` stays unique. `failed` and `extracting` rows are
normalized through `pending` before approval; `rejected` and `duplicate` rows are already
resolved and refuse approval.

`reject` → sealed reason + `UpdateCapture`, status `rejected`.

`retry` → refuse `approved`, `rejected` and `duplicate` rows before polling, then
`Repository.Snaptojson.Polling` on the `job_ref` the row already carries. The report is
written with a conditional update that also fails when the row was resolved while the
vendor was answering, so a read-back never reopens an approved capture.

`match` → `Module.Ledger.Get` for the named entry, then `UpdateCapture` with
`status='duplicate'` and `resolved_entry_id` — no ledger write.

## Path / query params

`ref` (32 lowercase hex, required).

## Body

| `action` | other fields | result |
| --- | --- | --- |
| `approve` | `occurred_on`, `currency`, `postings[]`, optional `payee_ref`, `note` | posts an entry, resolves the capture with `resolved_entry_ref` |
| `reject` | `reason` (≤ 2000) | `status: "rejected"`, `resolution_note` sealed |
| `retry` | — | reads `job_ref` back; `pending`, `extracting` or `failed` |
| `match` | `entry_ref` (32 hex, required) | `status: "duplicate"`, `resolved_entry_ref` set |

Posting shape is identical to `POST /api/entries`. The body speaks refs only: an
integer `payee_id` is an unknown field, so it answers `400 invalid_json` rather than
silently doing nothing.

## Response

`approve`: `201` with `{"entry":{…},"capture":{…}}`. `reject`, `retry` and `match`: `200`
with the capture. A resolved capture carries `resolved_entry_ref` (never an integer id).

## Errors

`403 forbidden` (missing action scope, before any downstream call); `400 invalid_json` (unknown field, malformed body); `404 not_found` (capture, `payee_ref`
or `entry_ref` names nothing); `409 capture_resolved` (already approved, rejected or
matched, or resolved by an approval while `retry` was polling); `409 invalid_state`
(approving a `rejected` or `duplicate` capture, `retry` with no `job_ref`, or no rail
configured); `409 duplicate` (the built entry collides
with an existing ledger entry); `422 invalid_request` (`action` missing or unknown,
`match` without `entry_ref`, bad date/amount, `postings_not_balanced` and friends from
the ledger).

## Limitations

No PDF parsing, no vendor-side draft push (`extracted`), no completeness gate. A `retry`
needs a `job_ref`, so a capture that was never submitted answers `409 invalid_state`. A
match records the link and never changes the entry it points at; approvals still require
the postings, because the draft is a suggestion, not a valid entry.

---

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant UI as Review screen
    participant H as Captures handler
    participant Q as Captures module
    participant L as Ledger module
    participant V as SnapToJSON
    participant DB as SQLite
    UI->>H: PATCH /api/captures/{ref} {action}
    alt action approve
        H->>Q: Approve(ref, payee_ref?, postings)
        Q->>Q: validate status; normalize failed/extracting through pending
        Q->>L: Build(entry from body, source from kind)
        L-->>Q: checked entry, no write yet
        Q->>DB: BEGIN; insert entry, postings and audit; update capture and audit; COMMIT
        H-->>UI: 201 entry + capture
    else action reject
        Q->>Q: seal reason
        Q->>DB: UPDATE capture rejected
        H-->>UI: 200 capture
    else action retry
        Q->>Q: refuse approved, rejected and duplicate
        Q->>V: poll job_ref
        V-->>Q: SnapReport
        Q->>DB: conditional UPDATE of an unresolved row
        H-->>UI: 200 capture, or 409 capture_resolved
    else action match
        Q->>L: Get(entry_ref)
        Q->>DB: UPDATE capture duplicate, resolved_entry_id
        H-->>UI: 200 capture
    end
```
