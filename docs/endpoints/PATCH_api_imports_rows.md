# PATCH /api/imports/{ref}/rows/{index}

**Auth.** Session cookie (`spenicle_session`). Open mode passes everything through; with a password set, a missing or stale cookie is `401 unauthorized`.

## Purpose

Edit one drafted row before the commit: fix the date or the amount, name the category or the payee, or decide that a row with a clash (or without one) should be posted or not. Every field is **absolute**, so re-sending the same body is a no-op — the retry-after-a-network-drop path.

## Upstream

The review screen's row editor; a script that accepts every row it recognises.

## Downstream

`Module.Imports.PatchRow`: load the batch, refuse a closed one, load the row by `(batch_id, row_index)`, apply the fields that are present, `Repository.Sqlite.UpdateImportRow`, then `ExtendImportBatch` pushes `expires_at` another 24 hours. The response is the whole batch, so the client never merges two documents.

## Path / query params

| name | notes |
| --- | --- |
| `ref` | the batch ref (32 lowercase hex) |
| `index` | the row's `row_index`, the 0-based position in the file |

## Body

| field | type | notes |
| --- | --- | --- |
| `occurred_on` | string | `YYYY-MM-DD` |
| `amount_minor` | string | signed minor units, `"-17500"` |
| `description` | string | at most 500 characters |
| `payee_ref` | string | a payee ref, `""` clears it |
| `category_ref` | string | an account ref, `""` clears it (the commit then uses `Unsorted`) |
| `status` | string | `accepted` or `skipped`; `pending` is server-assigned and not settable |

At least one field must be present. The `account_ref` of a row is fixed at upload: it is the batch's account.

## Response

`200` with the batch document from [`POST /api/imports`](./POST_api_imports.md), rows included, and `expires_at` moved forward.

## Errors

- `409 import_committed` — the batch is `committed` or `rejected`; a closed batch is immutable.
- `404 not_found` — the batch ref or the row index does not exist.
- `422 invalid_request` — no field was sent, `status` is not `accepted`/`skipped`, `occurred_on` or `amount_minor` does not parse, a `_ref` is not 32 hex, or the description is too long.

## Limitations

The row's account and its clash verdict are not editable: a clash is a warning about the ledger as it was at upload time, and a change of account is a new upload. No bulk patch — one row per request keeps the retry story trivial.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant H as Imports handler
    participant M as Imports module
    participant DB as SQLite
    C->>H: PATCH /api/imports/{ref}/rows/0 {"amount_minor":"-17500","status":"accepted"}
    H->>H: bindPath, bindBody, validate
    H->>M: PatchRow(ref, index, update)
    M->>DB: SELECT import_batches WHERE ref = ?
    alt committed or rejected
        M-->>H: ErrImportClosed
        H-->>C: 409 import_committed
    else draft
        M->>DB: SELECT import_rows WHERE batch_id = ? AND row_index = ?
        M->>DB: UPDATE import_rows SET the fields sent, updated_at
        M->>DB: UPDATE import_batches SET expires_at = now + 24h
        M->>DB: SELECT import_rows
        H-->>C: 200 the batch
    end
```
