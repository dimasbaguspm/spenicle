# DELETE /api/tokens/{ref}

**Auth.** **Root session only** — same rule as the other two token routes.

## Purpose

Revoke a token. The row stays, the credential stops answering.

## Upstream

The settings screen, "revoke" next to a leaked token.

## Downstream

`Module.Tokens.Revoke` → `Repository.Sqlite.RevokeToken`: one transaction that stamps
`revoked_at` where it is still null, appends the `api_token/revoke` journal row (actor from
the request context), and returns the row. A second revoke finds nothing and answers `404`.

## Path / query params

| param | notes |
| --- | --- |
| `ref` | the token's 32-hex ref |

## Body

None.

## Response

`200` with the revoked row: `ref`, `name`, `scopes`, `created_at`, `last_used_at`,
`revoked_at`.

## Errors

`404 not_found` for an unknown or already-revoked token, `422 invalid_request` for a ref
that is not 32 hex, `403 forbidden` for a token.

## Limitations

There is no un-revoke: issue a new token. Every request that carries the revoked secret
answers `401 unauthorized` from then on, and the journal keeps both the creation and the
revocation.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (root)
    participant H as Tokens handler
    participant T as Tokens module
    participant DB as SQLite
    C->>H: DELETE /api/tokens/{ref}
    H->>H: bindPath + validate the ref
    H->>T: Revoke(ref)
    T->>DB: BEGIN; UPDATE api_tokens SET revoked_at WHERE ref = ? AND revoked_at IS NULL; journal; COMMIT
    alt one row changed
        DB-->>T: the revoked row
        T-->>H: token
        H-->>C: 200 {ref, …, revoked_at}
    else nobody changed
        T-->>H: ErrNotFound
        H-->>C: 404 not_found
    end
```
