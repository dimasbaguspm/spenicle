# PATCH /api/intake

**Auth.** Instance password only. This route lives in the root-only group: a scoped Bearer credential is refused with `403 forbidden` before the handler runs; with no password seeded, open mode passes the request through.

## Purpose

Turn polling on or off and set the sender allowlist. One action, both fields, sealed at rest.

## Upstream

The settings screen after the mailbox is authorised.

## Downstream

`Module.Intake.Configure` → `Repository.Sqlite.SetSetting` with a sealed JSON envelope under
the `intake` key. Last write wins; there is one configuration, not one per sender.

## Path / query params

None.

## Body

| field | type | notes |
| --- | --- | --- |
| `enabled` | bool | no | defaults to false when omitted; send it explicitly to turn polling on |
| `allowlist` | string list | ≤ 50 entries, each ≤ 200 characters; matched against the lowercased `From` |

An entry is a **substring** of the sender, so `bank.example` accepts
`alerts@bank.example`. Values are trimmed and lowercased before they are stored.

## Response

**200** `{"enabled":true,"allowlist":["bank.example"]}` — the stored configuration, not the
request echoed back.

## Errors

- `422 invalid_request` — the body does not bind, or a list entry is too long.
- `500 internal_error` — the row could not be sealed or written.

## Limitations

- The allowlist is not a blocklist: an empty list accepts everything, which is only safe once
  the mailbox itself belongs to you.
- Substring matching means `example` accepts `example.com` and `evil-example.net`. Keep
  entries specific.

## Sequence

```mermaid
sequenceDiagram
    autonumber
    participant S as Settings screen
    participant H as Intake handler
    participant M as intake module
    participant DB as SQLite
    S->>H: PATCH /api/intake {enabled, allowlist}
    H->>H: bindBody, validate
    H->>M: Configure(Config)
    M->>M: trim, lowercase, encode, seal
    M->>DB: SetSetting('intake', sealed)
    M-->>H: stored Config
    H-->>S: 200 enabled, allowlist
```
