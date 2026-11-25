# F8 — The door out

**Status** live · **Client** export panel, progress polling, download, history drawer
**Routes** `POST /api/exports` · `GET /api/exports` · `GET /api/exports/{ref}` · `GET /api/exports/{ref}/events` · `GET /api/exports/{ref}/download`

## 1. The job the user has

"I want my data in a file I can open without this app." Two shapes of the same answer: one
JSON document (canonical, re-importable, refs only) or a zip of CSV sheets plus
`summary.json` and `manifest.json` (a spreadsheet). The export is a **job**, because
rendering the whole ledger inside a request would time out on a slow phone: the POST
answers `queued` and names a ref, and the worker renders it.

## 2. Client journeys (multi-hit by design)

### 2.1 Queue a job

```json
POST /api/exports
{"client_id":"laptop-2026-02-14","format":"json"}
```

`201` with `{ref, client_id, status:"queued", format, schema_version, bytes:0, created_at}`.
`client_id` is **required** and is the idempotency key: the same `client_id` + `format`
answers `200` with the same job; the same `client_id` with a different `format` is
`409 export_conflict` and writes nothing. `format` is `json` (default) or `csv`, fixed at
creation.

### 2.2 Watch it

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/exports/{ref}` | `queued` → `running` → `ready` or `failed`; `counts` and `bytes` appear once rendered |
| 2 | `GET /api/exports?status=ready` | the queue, if the client lost the ref |
| 3 | `GET /api/exports/{ref}/events` | the trail: `queued`, `resumed`, `started`, `completed`, `failed`, `downloaded`, `expired`, `swept` |

There is no push and no ETag: poll `GET /api/exports/{ref}` with a backoff of a few
seconds, and stop on a terminal status. A job waits for the next worker tick
(`WorkerInterval`, one hour by default), so the honest label for a fresh job is "queued —
it will be prepared at the next run", not "preparing…". `GET /healthz` →
`worker_last_run_at` is how the client tells the user whether the worker is alive.

### 2.3 Download

```
GET /api/exports/{ref}/download
```

| job status | answer |
| --- | --- |
| `ready` | `200` with the bytes, `Content-Disposition: attachment; filename="spenicle-<YYYY-MM-DD>.<json\|zip>"`, `Cache-Control: private, no-store` |
| `queued`, `running` | `409 export_not_ready` |
| `failed` | `409 export_failed` |
| `expired` | `410 gone` |
| unknown ref | `404 not_found` |

Downloading appends a `downloaded` event **before the first byte leaves**: a client that
disconnects mid-stream still leaves the record, which is deliberate (the audit trail says
"someone fetched this").

### 2.4 What is in the file

```json
{"schema_version":4,"exported_at":"…","base_currency":"IDR",
 "summary":{"accounts":[…],"months":[…],"categories":[…],"counts":{…}},
 "data":{"accounts":[…],"payees":[…],"entries":[…],"captures":[…],
         "recurring":[…],"rates":[…],"custom_queries":[…]}}
```

`data` is the canonical half: minor-unit strings, RFC3339 timestamps, `YYYY-MM-DD` dates,
32-hex refs only — no integer id and no sealed value, ever. `summary` is display sugar
computed from the same rows (one balance per account, spend and income per month, spend per
expense category, a row count per table) and is **not** re-importable.

The `csv` format is a zip in a fixed order: `accounts.csv`, `payees.csv`, `entries.csv`,
`postings.csv`, `captures.csv`, `rates.csv`, `recurring.csv`, `custom_queries.csv`,
`summary.json`, `manifest.json` (`{schema_version, exported_at, files:[{name, rows, sha256}]}`).
`postings.csv` is the money sheet: one row per posting.

## 3. Backend, end to end

```
POST /api/exports          Handler.Exports.Create → Module.Exports.Create
                           → lookup exports.client_id (replay) → SchemaVersion → insert `queued`
                           → append `queued` event, same call. Renders nothing.
GET  /api/exports          Handler.Exports.List   → ListExports (status, format, ref cursor, id DESC)
GET  /api/exports/{ref}    Handler.Exports.Get    → ExportByRef
GET  …/events              Handler.Exports.Events → ExportByRef + ListExportEvents
GET  …/download            Handler.Exports.Download → Module.Exports.Download
                           → status gate → append `downloaded` → Filestore(export store).Open

Worker (per run)           resume `running` jobs left by a restart (`resumed`, back to `queued`)
                           claim up to 5 `queued` jobs (compare-and-swap) → `started`
                           render via module/export (JSON document | zip of CSVs)
                           store bytes in the export store, stamp counts/bytes/expires_at → `ready`
                           sweep: `running` older than ExportStaleAfter (15m) → failed (`swept`)
                           drop blobs past ExportRetention (720h) → `expired` (20 per run)
```

- **The job is the promise; the document is rendered when claimed.** That is stated in the
  payload: `exported_at` inside the file, `started_at`/`finished_at` on the row. A ledger
  change after the render is not in the document — queue another export.
- **Byte-identical for the same data.** The renderer sorts deterministically, so two jobs
  over an unchanged ledger produce the same bytes; that is what makes `manifest.json`'s
  per-file `sha256` useful.
- **The bytes are sealed.** They live in a second `filestore.Store` (`./data/exports`)
  encrypted under `APP_SECRET`, exactly like capture artifacts: a changed secret makes
  every stored export unreadable and the boot does not notice.
- **Every step is an event with an actor** — `user` for queued/resumed/downloaded,
  `worker` for started/completed/failed/expired/swept. A refused create writes nothing.

## 4. RRR

### Requirements

1. `POST /api/exports` never streams bytes and never renders: it stores a job and returns.
2. `client_id` is required and idempotent; the same id with a different `format` is
   `409 export_conflict` and leaves the existing job untouched.
3. A job's status moves `queued → running → ready|failed` (or `expired` after retention);
   `ready` is the only status the download serves.
4. A blob that is gone answers `410 gone` while the row keeps answering `200` as
   `expired`: a swept file is "reclaimed", never "not found".
5. The document contains refs and money strings only — no integer id, no sealed payload.
6. Two exports of an unchanged ledger are byte-identical.
7. A restart does not lose a job: a `running` job is put back to `queued` with a `resumed`
   event before the worker claims again.
8. Every transition is in `export_events`, readable and append-only.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| the file is rendered at claim time, not request time | a user who queues at 09:00 and downloads at 11:00 gets 11:00 data | the payload carries `exported_at`, `started_at`, `finished_at`; the UI should show the render time next to the download |
| an hour of latency by default | "export" feels broken on a fresh job | poll with backoff, label the wait as a scheduled job, and show `worker_last_run_at`. A stale heartbeat means "the worker is not running", which is the real answer |
| blobs expire after 720h | a month-old link answers `410` | the row stays `expired` and the list keeps it, so the client can explain and offer "queue it again" (a new `client_id`) |
| the download is recorded before the first byte | a failed or aborted download still shows as downloaded | correct as an audit record; the UI must not treat it as "the user has the file" |
| `APP_SECRET` rotation | every stored export becomes unreadable | boot refuses a changed secret; back the secret up next to the database |
| no date range | a huge ledger is one big document | single user volume, and the file is meant to be a complete backup: rendering is a job, so a large ledger costs a wait, never a timeout |
| no cancel and no re-queue | a stuck job cannot be stopped | a `running` job older than 15 minutes is failed by the sweep; otherwise queue a new job with a new `client_id` |

### Rollout

1. **Queue + poll first** (`POST`, `GET /api/exports/{ref}`): proves the job round trip
   without holding a request open.
2. **Download second**, with the status gate handled explicitly (`409`/`410` messages, not
   a generic failure toast).
3. **CSV last** — the JSON document is the canonical backup; the zip is a convenience and
   its file order is fixed, so the client should not promise a custom spreadsheet.
4. Rollback: hide the panel. Jobs already rendered are inert rows; their blobs are swept
   after retention without any action.

## 5. Acceptance criteria

```gherkin
Scenario: A queued export answers at once and renders later
  When I send a POST to "/api/exports" with:
    """json
    {"client_id":"laptop-1","format":"json"}
    """
  Then the response status is 201
  And the response body has status "queued"
  And the response body has bytes "0"
  And the response body carries "ref"
  When I send a GET to "/api/exports/{{ref}}"
  Then the status is still "queued"

Scenario: A replay returns the same job
  Given a job queued with client_id "laptop-1" and format "json"
  When I send the same POST again
  Then the response status is 200
  And the response body has the same ref
  And the store holds 1 "exports" row

Scenario: The same client_id with another format is refused
  Given a job queued with client_id "laptop-1" and format "json"
  When I send the same client_id with format "csv"
  Then the response status is 409
  And the error code is "export_conflict"

Scenario: The worker renders the document and the download serves it
  Given a queued export
  When the worker runs
  Then the export status is "ready"
  And counts and bytes are set
  When I send a GET to "/api/exports/{{ref}}/download"
  Then the response status is 200
  And the body carries schema_version, summary and data
  And the events carry "queued", "started", "completed" and "downloaded"

Scenario: A not-ready export is refused by name
  Given a queued export
  When I send a GET to "/api/exports/{{ref}}/download"
  Then the response status is 409
  And the error code is "export_not_ready"

Scenario: An expired job keeps its row and loses its bytes
  Given a ready export past its retention
  When the worker sweeps
  Then the export status is "expired"
  When I send a GET to "/api/exports/{{ref}}/download"
  Then the response status is 410
  And the error code is "gone"
  When I send a GET to "/api/exports/{{ref}}"
  Then the response status is 200
  And the status is "expired"

Scenario: A restart resumes a running job instead of failing it
  Given a job left "running" by a restart
  When the worker runs
  Then a "resumed" event was written
  And the job status is "queued" before it is claimed again

Scenario: The CSV format is a zip with a manifest
  Given a ready export with format "csv"
  When I download it
  Then the body is a zip carrying "summary.json" and "manifest.json"
  And the manifest lists a sha256 per file
```

## 6. What this page does not promise

- No date range, no per-table filter, no `client_id` filter on the list.
- No cancel, no re-queue, no ETag.
- No re-import: the document is re-importable in shape, but no route reads an export back
  in (statement import is CSV in, [F6](./06-statement-import.md)).
- No range requests: one blob, decrypted and streamed whole.
