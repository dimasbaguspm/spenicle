# POST /api/intake/messages/{ref}/refresh

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`. This route lives in the root-only group, so only the instance password reaches it.

## Purpose

Ask the provider for one message again and record what changed. This is how an amended mail
becomes a fresh capture, and how a deleted one is marked instead of silently kept.

## Upstream

An operator re-reading one mail, or an agent that wants the latest state of a reference.

## Downstream

`Module.Intake.Refresh` → `Repository.Mailbox.Refresh` (one message) → `Module.Captures.Create`
when the revision moved → `Repository.Sqlite.UpdateMailMessage` to stamp the outcome.

## Path / query params

| name | notes |
| --- | --- |
| `ref` | the mail reference (32 lowercase hex) |

## Body

None.

## Response

**200** the same shape as `GET /api/intake/messages/{ref}`.

Behaviour, by what the provider answers:

| provider | outcome |
| --- | --- |
| same revision | the stored row, only `last_synced_at` moves |
| newer revision | a **new** row whose ref is returned; the old row gets `superseded_by` |
| message gone | the stored row, `status: gone` |
| call failed | the stored row, `attempts` incremented and the row's error recorded |

## Errors

- `404 not_found` — no reference with that ref.
- `422 invalid_request` — the ref is not 32 lowercase hex.
- `500 internal_error` — the provider call failed in a way the row could not record.

## Limitations

- A refresh never mutates a capture and never touches the ledger: the new revision is a new
  capture that still needs approval.
- An amendment is detected by the provider's revision handle, not by comparing content, so a
  provider that does not move its revision will report `unchanged`.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Intake handler
    participant M as intake module
    participant P as Mailbox adapter
    participant Q as captures module
    participant DB as SQLite
    C->>H: POST /api/intake/messages/{ref}/refresh
    H->>M: Refresh(ref, now)
    M->>DB: MailMessageByRef(ref)
    alt unknown ref
        M-->>H: ErrNotFound
        H-->>C: 404 not_found
    else known
        M->>P: Refresh(message_ref)
        alt gone
            M->>DB: Update(status = gone)
            M-->>H: row
        else same revision
            M->>DB: Update(last_synced_at)
            M-->>H: row
        else newer revision
            M->>Q: Create(kind = email)
            M->>DB: InsertMailMessage + supersede the old row
            M-->>H: fresh row
        end
        H-->>C: 200 row
    end
```
