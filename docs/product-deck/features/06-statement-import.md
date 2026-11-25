# F6 — A bank CSV becomes a reviewable draft

**Status** live · **Client** import list, upload wizard, row editor, commit confirmation, history drawer
**Routes** `POST /api/imports` · `GET /api/imports` · `GET /api/imports/{ref}` · `PATCH /api/imports/{ref}/rows/{index}` · `PATCH /api/imports/{ref}` · `GET /api/imports/{ref}/events`

## 1. The job the user has

"My bank gave me a CSV with 214 lines. I do not want to type 214 entries, and I do not
want 40 duplicates either." The shape that solves it: an upload becomes a **draft** —
rows on screen, clashes already flagged, each row editable — and exactly one review
action closes it. Nothing reaches the ledger before that action.

## 2. Client journeys (multi-hit by design)

### 2.1 Upload

The statement contract is fixed and tiny (a header row is required):

```csv
occurred_on,amount_minor,description
2026-02-01,-18000,KOPI KENANGAN
2026-02-03,2500000,SALARY
```

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/accounts?kind=asset` | pick the account the statement belongs to (defaults to `Unsorted`) |
| 2 | `POST /api/imports` (multipart) | `file`, `client_id` (≤ 64, the idempotency key), optional `account_ref` |
| 3 | same call, chunked | add `chunk_index` + `chunk_total`; each chunk answers `202` with `{received_chunks, chunk_total, received_bytes}`, the last one assembles the draft and answers `201` |
| 4 | `POST /api/imports` again with the same `client_id` and bytes | `200` with the same batch — the resume path after a restart |

Caps: `ImportMaxBytes` 32 MiB per file, `ImportMaxRows` 50 000 rows. A well-formed header
with a bad line does not fail the upload: that row is stored `skipped` with
`clash_kind: "invalid_row"`, so the user sees the line instead of losing the file.

Clashes are computed **once, at upload**, and they are deterministic:

| `clash_kind` | rule | default row status |
| --- | --- | --- |
| `already_imported` | the ledger already holds `client_id = import:<file_hash>:<row_index>` | `skipped` |
| `duplicate` | same day, currency and absolute amount, with a posting on the batch account | `skipped` |
| `possible_duplicate` | amount and currency match, date within 3 days | `skipped` |
| `invalid_row` | the line does not parse | `skipped` |
| — | no clash | `pending` |

A clash is a suggestion, not a veto: the user can flip a skipped row to `accepted`.

### 2.2 Review

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/imports?status=draft` | batches newest first; `rows` are not inlined, only `rows_total` |
| 2 | `GET /api/imports/{ref}` | the batch **with** its rows, byte-shaped like the upload response |
| 3 | `PATCH /api/imports/{ref}/rows/{index}` | edit one row; the response is the whole batch, so the client never merges two documents |
| 4 | `PATCH /api/imports/{ref}` `{"action":"commit"}` | post the accepted rows |
| 5 | `PATCH /api/imports/{ref}` `{"action":"reject","reason":"wrong account"}` | discard the draft, keep the evidence |
| 6 | `GET /api/imports/{ref}/events` | why a row is not in the ledger |

The row patch is **absolute** (`occurred_on`, `amount_minor`, `description`,
`payee_ref`, `category_ref`, `status` — `accepted` or `skipped`), so re-sending the same
body is a no-op: that is the retry-after-a-network-drop path. The row's `account_ref` is
fixed at upload (it is the batch's account), and `pending` is server-assigned, never
settable.

Every successful patch pushes `expires_at` another 24 hours and appends `row_edited` (with
the field list in request order) plus `row_accepted`/`row_skipped` when the status moved.

### 2.3 Commit

`{"action":"commit"}` flips the batch `draft → committing` with a compare-and-swap, then
posts accepted rows in chunks of 500. Each posted row becomes an entry with

- `client_id = import:<file_hash>:<row_index>` — the final idempotency guard,
- `source = "statement"`, `occurred_on` from the row, `note` = the description,
- postings `[{account_ref, -amount_minor}, {category_ref or Unsorted, +amount_minor}]`.

One `committing` event per chunk carries `{rows_done, rows_total}`. A cancellation or a
restart leaves the batch `committing`, and **replaying `commit` resumes**: rows whose
`client_id` is already in the ledger are skipped. That is why a long commit is safe to
retry and why the client can show progress from the event log.

`reject` stamps `status = rejected`, keeps rows and blob, and stores the optional `reason`
(≤ 1000) on the `rejected` event — never on the batch row.

## 3. Backend, end to end

```
POST /api/imports              Handler.Imports.Create → Module.Imports.Create
                               → sha256(bytes) → Repository.Filestore.Put (hash-addressed, no artifacts row)
                               → parse CSV (exact header check) → resolve batch account + currency
                               → clash probes (already_imported / duplicate / possible_duplicate / invalid_row)
                               → one TX: import_batches + every import_rows + `uploaded` event
GET  /api/imports              → ListImportBatches (status, ref cursor, id DESC)
GET  /api/imports/{ref}        → ImportBatchByRef + ImportRows (ORDER BY row_index)
PATCH …/rows/{index}           → PatchRow: load batch (409 import_closed) → UpdateImportRow
                               → ExtendImportBatch (+24h) → row_edited / row_accepted / row_skipped events
PATCH /api/imports/{ref}       → Review: CAS draft→committing → Module.Ledger.Post per accepted row
                               → CloseImportBatch (committed_at | rejected_at) + terminal event
GET  …/events                  → ListImportEvents (id DESC, ref cursor)

Worker (per run)               → collectImports: drop drafts past expires_at (50/run) + `expired` event
                               → collectUploads: drop `open` uploads idle 24h (rows + .part file)
```

- **Two phases because the file is the client's.** Upload never trusts the CSV: every row
  is stored with its verdict, and the ledger only sees rows the user accepted. The batch
  keeps `file_hash` only — the bytes live in the filestore, encrypted like every other
  artifact.
- **Chunked uploads are a resumable file, not a retry of the whole body.** Chunks append
  to `<DataDir>/imports/<client_id>.part` and are recorded idempotently
  (`UNIQUE (upload_id, chunk_index)`); a repeated index truncates back and answers `200`,
  so a bad retry cannot corrupt the file.
- **The ledger's `client_id` is the commit's real guard.** The compare-and-swap on
  `status` keeps two reviewers out, and the per-row `client_id` keeps two commits from
  double-posting — which is why a half-finished commit is a resumable state rather than a
  disaster.
- **The event log is the explanation.** `uploaded`, `resumed`, `conflict_refused`,
  `row_edited`, `row_accepted`, `row_skipped`, `committing`, `committed`, `rejected`,
  `expired` — each with `actor` `user` or `worker`. Nothing rewrites or deletes an event.

## 4. RRR

### Requirements

1. An upload never writes a ledger entry. Only `{"action":"commit"}` does.
2. The same `client_id` with the same bytes resumes the batch (`200` / `201` on the last
   chunk); with different bytes it is `409 import_conflict` and writes nothing.
3. A row is posted at most once, whatever the number of commit retries: the ledger
   `client_id` `import:<file_hash>:<row_index>` is unique.
4. A row patch is absolute and idempotent; `pending` is not settable, `account_ref` is not
   editable, and a closed batch is immutable (`409 import_closed`).
5. Clash detection runs once, at upload, from the ledger as it was then; the result is a
   default, not a lock.
6. A draft lives 24 hours past its last edit; after that the worker drops it (rows, blob,
   one `expired` event, 50 per run). A `committed` or `rejected` batch is kept forever.
7. Every state change on a batch is in `import_events`, with an actor; the log is readable
   and append-only.
8. Nothing about the file is guessed: the header must be exactly
   `occurred_on,amount_minor,description` (or with an extra `currency` column), or the upload is refused with no batch.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| a commit is not one transaction | a failure halfway leaves a half-posted draft | deliberate: each row is its own entry with its own `client_id`, and replaying `commit` resumes from the rows the ledger already holds. The client must show "committed N of M" from the event log, not an all-or-nothing spinner |
| a long commit outlives a proxy timeout | the request dies at chunk 40 of 100 | the batch stays `committing`; the retry resumes. The client should poll `GET /api/imports/{ref}` until `committed` instead of holding one request open |
| row edits during a commit | a row set changing under a running commit | `409 import_committing` on the row patch — the set is frozen from `committing` to terminal |
| the batch currency is the base currency only | a USD statement cannot be imported with its own rates | upload it as base-currency entries and fix rates per entry, or wait for an FX column (see [F9](./09-gaps-and-next.md)) |
| the account was archived after upload | the commit posts to an archived account (archive does not block posting) | accepted by design: the balance history must stay writable; the UI should warn if the batch account is archived |
| a rejected batch cannot be reopened | the user who rejected by accident re-uploads | the re-upload with a **new** `client_id` recomputes the clashes and gives a fresh draft; the old batch remains as evidence |
| drafts expire quietly | a user opens the review screen two days later and the batch is gone | the client must show `expires_at` and refresh it on every patch; a dropped draft answers `404 not_found` (no tombstone) |

### Rollout

1. **Upload + list first.** Even without review, a draft costs nothing and proves the CSV
   contract.
2. **Then the row editor**, which is the feature: accept/skip/edit one row per request,
   rendering from the batch document every time.
3. **Commit last**, behind a confirmation that names the counts ("post 187 of 214 rows").
   Show the event log in a drawer — it is the support answer.
4. Rollback: reject every open draft (`{"action":"reject"}`), and hide the entry point. A
   committed batch is plain ledger history and needs no rollback.

## 5. Acceptance criteria

```gherkin
Scenario: An upload drafts rows and posts nothing
  When I upload "march.csv" with client_id "statement-1"
  Then the response status is 201
  And the response body has status "draft"
  And the rows carry their clash kinds
  And the store holds 0 "ledger_entries" rows

Scenario: A replayed upload resumes instead of duplicating
  Given a draft uploaded with client_id "statement-1"
  When I upload the same bytes with client_id "statement-1"
  Then the response status is 200
  And the store holds 1 "import_batches" row

Scenario: The same client_id with different bytes is refused
  Given a draft uploaded with client_id "statement-1"
  When I upload different bytes with client_id "statement-1"
  Then the response status is 409
  And the error code is "import_conflict"
  And the batch still carries its original rows

Scenario: A wrong header writes nothing
  When I upload a CSV whose header is "date,amount,memo"
  Then the response status is 422
  And the error code is "invalid_request"
  And the store holds 0 "import_batches" rows

Scenario: A duplicate is flagged and skipped by default
  Given a ledger entry of "-18000" on "2026-02-01"
  When I upload a statement containing that line
  Then the row carries clash_kind "duplicate"
  And the row status is "skipped"

Scenario: Committing posts only the accepted rows
  Given a draft with 3 rows, 2 accepted
  When I send a PATCH to "/api/imports/{{ref}}" with:
    """json
    {"action":"commit"}
    """
  Then the response status is 200
  And the batch status is "committed"
  And the store holds 2 "ledger_entries" rows with source "statement"
  And each entry carries client_id "import:<file_hash>:<row_index>"

Scenario: A replayed commit posts nothing twice
  Given a committed batch
  When I send the same commit again
  Then the response status is 200
  And the store still holds 2 "ledger_entries" rows
  And no second "committed" event was written

Scenario: A row edit on a closed batch is refused
  Given a committed batch
  When I send a PATCH to "/api/imports/{{ref}}/rows/0" with:
    """json
    {"status":"accepted"}
    """
  Then the response status is 409
  And the error code is "import_closed"

Scenario: Rejecting keeps the evidence
  Given a draft
  When I send a PATCH to "/api/imports/{{ref}}" with:
    """json
    {"action":"reject","reason":"wrong account"}
    """
  Then the response status is 200
  And the batch status is "rejected"
  And the events carry a "rejected" entry with reason "wrong account"
  And the store still holds the batch rows

Scenario: Chunked uploads resume and assemble
  When I upload chunk 0 of 2 for client_id "big-1"
  Then the response status is 202
  And the progress reads received_chunks "1"
  When I upload the same chunk 0 again
  Then the response status is 200
  When I upload chunk 1 of 2
  Then the response status is 201
  And the batch carries every row
```

## 6. What this page does not promise

- No column mapping, no delimiter/encoding detection, no PDF, no XLSX.
- Per-row currency is supported via an optional `currency` column; otherwise the batch (base) currency applies. No column mapping beyond that.
- No partial-failure report in the commit response — the event log is the report.
- No reopen of a rejected batch; no bulk row patch.
- A reclaimed draft is gone, not tombstoned.
