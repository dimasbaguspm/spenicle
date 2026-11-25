# POST /api/exports

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Queue one export of the whole ledger, or of one date window inside it. The route answers `201` with a `queued` job and returns immediately: the worker renders the document later, so a slow read costs a job, not a request. `client_id` is the idempotency key — a replay returns the same job, and the same `client_id` with another `format` or another window is a conflict instead of a second one.

## Upstream

The "export" button, a script before an upgrade, or the spreadsheet path. One call per direction: this one never returns bytes, `GET /api/exports/{ref}/download` does.

## Downstream

`Module.Exports.Create`: look up `exports.client_id`, read `SchemaVersion` from `System`, insert the `queued` row and append the `queued` event in the same call. Nothing is rendered and nothing is read from the ledger.

## Path / query params

None.

## Body

```json
{"client_id": "laptop-2026-02-14", "format": "json", "from": "2025-01-01", "to": "2025-12-31"}
```

| field | type | required | notes |
| --- | --- | --- | --- |
| `client_id` | string | yes | ≤ 64, the idempotency key |
| `format` | string | no | `json` (default) or `csv` |
| `from` | date | no | `YYYY-MM-DD`, inclusive first day of the window; `to` is required with it |
| `to` | date | no | `YYYY-MM-DD`, inclusive last day of the window; `from` is required with it |

A window is both ends or neither: one date alone is `422 invalid_request`. The window is stored on the job (`exports.from_on`, `exports.to_on`), so the worker renders exactly it, and it is part of the job's identity next to `client_id`.

## Response

`201` for a new job, `200` for a replay of the same `client_id`, `format` and window:

```json
{
  "ref": "3f2a…",
  "client_id": "laptop-2026-02-14",
  "status": "queued",
  "format": "json",
  "from": "2025-01-01",
  "to": "2025-12-31",
  "schema_version": 4,
  "bytes": 0,
  "created_at": "2026-02-14T09:00:00Z"
}
```

`from` and `to` are omitted for an unwindowed job. `counts` (per table), `started_at`, `finished_at`, `expires_at` and `error_message` appear once the worker has claimed or finished the job.

## Errors

- `409 export_conflict` — the same `client_id` already names a job with another `format` or another window. The existing job is untouched and no `resumed` event is written.
- `422 invalid_request` — `client_id` missing or too long, `format` neither `json` nor `csv`, a `from`/`to` that is not `YYYY-MM-DD`, or one end of a window without the other.
- `400 invalid_json` — the body is not JSON or carries an unknown field.
- `500 internal_error` — the write failed; the cause is logged, never sent.

## Limitations

- One export at a time per `client_id`; there is no "cancel" and no re-queue. A `failed` job keeps its `error_message`, and the way forward is another `client_id`.
- The job is `queued` until the next worker tick claims it (`WorkerInterval`, one hour by default). The document is not a snapshot of the request: it is rendered when claimed, so it carries whatever the ledger holds at that moment.
- `format` and the window are fixed at creation. Changing your mind is a new job with a new `client_id`.
- A window narrows the ledger, not the document's shape: `accounts`, `payees`, `captures`, `recurring`, `rates` and `custom_queries` are exported whole, and only `entries`, their `postings` and the `summary` figures follow the window.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Exports handler
    participant M as exports module
    participant DB as SQLite
    C->>H: POST /api/exports {client_id, format, from, to}
    H->>H: bindBody, validate, both ends or neither
    H->>M: Create(CreateInput{FromOn, ToOn})
    M->>DB: SELECT exports WHERE client_id = ?
    alt client id known
        M->>M: format or window differs? → ErrExportConflict
        M->>DB: INSERT export_events (resumed)
        M-->>H: existing job, created = false
        H-->>C: 200 job
    else new client id
        M->>DB: SELECT schema version
        M->>DB: INSERT exports (queued, from_on, to_on)
        M->>DB: INSERT export_events (queued)
        M-->>H: job, created = true
        H-->>C: 201 job
    end
```
