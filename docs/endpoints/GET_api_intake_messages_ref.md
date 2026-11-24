# GET /api/intake/messages/{ref}

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`. This route lives in the root-only group, so only the instance password reaches it.

## Purpose

One mail reference: which provider message produced which capture, what happened to it, and
the handle a refresh would use. It carries no mail content — the body is sealed in the capture.

## Upstream

The settings screen's intake list, and a log line that named a reference.

## Downstream

`Module.Intake.MessageByRef` → `Repository.Sqlite.MailMessageByRef`.

## Path / query params

| name | notes |
| --- | --- |
| `ref` | the mail reference (32 lowercase hex) |

## Body

None.

## Response

**200**

```json
{"ref":"<32 hex>","source":"gmail","message_ref":"18c…","message_id_header":"<abc@bank.example>",
 "provider_revision":"1042","received_at":"2026-02-14T09:00:00Z","observed_at":"2026-02-14T09:05:00Z",
 "status":"captured","last_synced_at":"2026-02-14T09:05:00Z"}
```

`status` is `captured`, `skipped`, `failed` or `gone`; `skip_reason` names why a skip happened
(`sender_not_allowed`, `no_body`, `duplicate`, `too_large`), and `superseded_by` points at the
reference that replaced this one after a refresh.

## Errors

- `404 not_found` — no reference with that ref.
- `422 invalid_request` — the ref is not 32 lowercase hex.
- `500 internal_error` — the read failed.

## Limitations

- There is no list route yet: a reference has to be known by ref, which the client gets from a
  poll result or the log.
- `capture_id` is not exposed as a ref: the capture is reached through `GET /api/captures` by
  its own ref once the list route returns it.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Intake handler
    participant M as intake module
    participant DB as SQLite
    C->>H: GET /api/intake/messages/{ref}
    H->>H: bindPath(ref)
    H->>M: MessageByRef(ref)
    M->>DB: SELECT mail_messages WHERE ref = ?
    alt no row
        M-->>H: found = false
        H-->>C: 404 not_found
    else found
        M-->>H: reference row
        H-->>C: 200 row
    end
```
