# PATCH /api/imports/{ref}

**Auth.** `Authorization: Bearer <credential>`: the instance password, or a token carrying this route's scope. Open mode passes everything through; with a password set, a missing or wrong credential is `401 unauthorized`, and a token without the scope is `403 forbidden`.

## Purpose

Close a draft, with one action in the body:

- `commit` posts every row the user accepted to the ledger and turns the batch `committed`;
- `reject` throws the draft away, turns the batch `rejected` and keeps the rows and the file for audit.

The same action twice is a no-op (`200` with the current batch, no second posting, no second event); the other action on a closed batch is `409 import_closed`.

## Upstream

The review screen's "commit" and "discard" buttons; a script that retries after a timeout, which is exactly why both actions are replayable.

## Downstream

`Module.Imports.Review`: load the batch (`404` when the ref names none), then one of two paths.

`commit`:

- a `committed` batch returns as-is, a `rejected` one is `409 import_closed`;
- the batch is flipped `draft → committing` with a compare-and-swap
  (`UPDATE … WHERE status = 'draft'`); the loser of that race re-reads and either
  resumes or answers `409`;
- accepted rows are posted in chunks of `ImportCommitChunk` (default 500). After
  each chunk one `committing` event carries `{"rows_done":N,"rows_total":M}`, and
  `ctx.Err()` is checked between chunks, so a cancelled request stops between two
  chunks with the batch still `committing`;
- for each row with `status = accepted`, `ledger.Post` with
  - `client_id = import:<file_hash>:<row_index>`,
  - `source = statement`, `occurred_on` from the row, note = the description, payee when one was patched,
  - currency = the batch currency (the locked base currency),
  - postings `[{account_ref, -amount_minor}, {category_ref or Unsorted, +amount_minor}]`;
- `Repository.Sqlite.CloseImportBatch` stamps `status = committed` and `committed_at`, and one `committed` event is appended.

A replay of `commit` on a batch left `committing` by a cancelled request or a
restart **resumes**: the rows whose
`client_id = import:<file_hash>:<row_index>` is already in the ledger are skipped
(that probe is the resume filter) and only the rest are posted. The ledger
`client_id` is the final guard, so no row can be posted twice.

`reject`:

- a `rejected` batch returns as-is, a `committed` one is `409 import_closed`;
- `CloseImportBatch` stamps `status = rejected` and `rejected_at` — the rows and the blob are untouched;
- one `rejected` event is appended, carrying `{"reason": "..."}` when the body sent one. The reason lives on the event, never on the batch row.

## Path / query params

`{ref}` is the batch ref (32 lowercase hex).

## Body

| field | type | notes |
| --- | --- | --- |
| `action` | string | required, `commit` or `reject` |
| `reason` | string | optional, at most 1000 characters; stored on the `rejected` event and ignored by `commit` |

## Response

`200` with the batch document (rows included). `status` is `committed` with `committed_at` set, or `rejected` with `rejected_at` set. A replay answers the identical document: the second call finds the terminal status and stops before the ledger and before the event log.

Rows that were `pending` or `skipped` are not posted and stay in the batch for audit — a `skipped` row is how the shell keeps the reason it did not post something.

## Errors

- `409 import_committing` — `PATCH /api/imports/{ref}/rows/{index}` while the batch is `committing`; a commit is in flight and the row set is frozen until it finishes or is resumed.
- `409 import_closed` — the other action on a terminal batch: `commit` on a `rejected` batch, `reject` on a `committed` one. The message names the state; the entries of a committed batch are undone with `PATCH /api/entries/{ref}` and `{"void": true}`, not here.
- `404 not_found` — the ref names no batch.
- `422 invalid_request` — `action` missing or not one of the two, `reason` too long.
- `422 invalid_postings`, `422 unknown_currency`, `422 invalid_rate` — a row could not become a balanced entry (a deleted account, a category that is not an account); nothing after it is posted and the batch stays `draft`, so the fix is a `PATCH` on the row and a retry.

## Limitations

Not one transaction: the ledger writes are per-row entries, so a failure halfway leaves the rows already posted behind. That is deliberate — each row is its own `client_id`, so retrying the commit resumes instead of duplicating, and a partial commit is visible as a draft that is half posted. No partial-failure report in the response yet.

A rejected batch cannot be reopened: upload the file again under a new `client_id` (a fresh draft recomputes the clashes). A committed or rejected batch is kept forever — rows, blob and events — while an abandoned `draft` is reclaimed by the worker 24 hours after its last edit.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Imports handler
    participant M as Imports module
    participant L as Ledger module
    participant DB as SQLite
    C->>H: PATCH /api/imports/{ref} {"action":"commit"}
    H->>H: bindPath, bindBody, validate the action
    H->>M: Review(ref, {action, reason})
    M->>DB: SELECT import_batches WHERE ref = ?
    alt same action on a terminal batch
        M->>DB: SELECT import_rows
        H-->>C: 200 the same batch
    else the other action
        M-->>H: ErrImportClosed
        H-->>C: 409 import_closed
    else draft + commit
        M->>DB: SELECT import_rows WHERE batch_id = ?
        loop every accepted row
            M->>L: Post(client_id = import:hash:index, source = statement)
            L->>DB: SELECT entry WHERE client_id = ? (replay guard)
            L->>DB: INSERT ledger_entries + ledger_postings
        end
        M->>DB: UPDATE import_batches SET status = committed, committed_at
        M->>DB: INSERT import_events (committed)
        H-->>C: 200 the committed batch
    else draft + reject
        M->>DB: UPDATE import_batches SET status = rejected, rejected_at
        M->>DB: INSERT import_events (rejected, payload = reason)
        H-->>C: 200 the rejected batch
    end
```
