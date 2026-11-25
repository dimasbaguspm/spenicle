# F2 — Capture now, decide later

**Status** live · **Client** share sheet, paste box, camera upload, review queue, receipt viewer, mail intake panel
**Routes** `POST /api/captures` · `GET /api/captures` · `PATCH /api/captures/{ref}` · `GET /api/captures/{ref}/artifact` · `GET /api/intake` · `PATCH /api/intake` · `POST /api/intake/run` · `GET /api/intake/messages` · `GET /api/intake/messages/{ref}` · `POST /api/intake/messages/{ref}/refresh`

## 1. The job the user has

"I am at the till with one hand free. Photograph the receipt now, sort it tonight." And
tonight: "show me everything I have not filed yet, let me fix what the machine misread,
and file it — or throw it away with a reason."

The invariant behind the whole feature: **a capture never writes a ledger entry**.
Approval does. A capture is evidence plus a draft; the ledger is a decision.

## 2. Client journeys (multi-hit by design)

### 2.1 Capture in two seconds

| # | call | body |
| --- | --- | --- |
| 1 | `POST /api/captures` | `{"kind":"share","raw_text":"KOPI KENANGAN 18.000","client_id":"<uuidv7>"}` |
| 2 | `POST /api/captures` (multipart) | one `file` part — the receipt photo, up to `ArtifactMaxBytes` (10 MiB) |

`202` when the row is new, `200` when the dedupe key already knew it — both carry the
capture, so a retry after a network drop is safe by returning the same thing instead of
a second row. The dedupe key is `sha256(kind | client_id | artifact_hash | raw_text)` and
it is `UNIQUE` in the table: the uniqueness is the guard, not a client check.

`kind` is `share`, `image`, `email`, `statement`, `recurring` or `manual`. `raw_text` is
capped at 8000 characters. Two things happen after the insert, and both are invisible to
the caller:

1. the payload is sealed (AES-256-GCM, `v1:` envelope) before it touches a column;
2. when SnapToJSON is configured, the rail reads it — the uploaded file, or the pasted
   text as a `capture.txt` — and the row becomes `extracting` with a `job_ref`;
   `retry` polls that job, the vendor's report lands in the sealed `draft_json` and the
   row moves to `pending` (or `failed` with `extraction_error` when the submit or the
   report was refused). SnapToJSON is the only rail: OpenAI is not a fallback, so an
   instance without `SNAPTOJSON_API_KEY` keeps every capture manual.

So the first response is the whole story from the shortcut's point of view: the capture
exists and it is safe. Status `pending` means "a human must decide", `extracting` means
"a machine is reading it".

### 2.2 The review queue

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/captures?status=pending` | `extracting` first, then `pending` oldest-first, then the resolved tail |
| 2 | `GET /api/captures?refs=<ref>` | refresh exactly the rows on screen after a decision |
| 3 | `GET /api/captures/{ref}/artifact` | the receipt bytes, `Content-Disposition: attachment`, `Cache-Control: private, no-store` |
| 4 | `PATCH /api/captures/{ref}` | one action: `approve`, `reject` or `retry` |

`approve` needs the fields a ledger entry needs, because that is what it will write:

```json
{"action":"approve","occurred_on":"2026-02-14","currency":"IDR",
 "postings":[{"account_ref":"<Cash>","amount_minor":"-18000"},
             {"account_ref":"<Unsorted>","amount_minor":"18000"}],
 "note":"coffee"}
```

The approve body carries a **payee**: `payee_ref` is resolved through `PayeeSource.PayeeByRef`
and stored on the entry, while the postings carry the money. It answers `201` with
`{entry, capture}`, stamps the capture `approved` in the same call, and the capture carries
`resolved_entry_ref`. The `match` action links the capture to an entry that already exists
instead — `200`, status `duplicate`, no ledger write — and an integer `payee_id` is an unknown
field, so it answers `400 invalid_json`.

`reject` takes `{"action":"reject","reason":"not mine"}` — the reason is sealed into
`resolution_note` and the row becomes `rejected`; the artifact stays until the worker
reclaims it after `ArtifactRetention` (720h), after which the download route answers
`410 gone` while the row survives.

`retry` re-reads the vendor job named by `job_ref` and maps the report onto the row. A capture
that was never submitted has no `job_ref`, so it answers `409 invalid_state` rather than
pretending to retry.

The response is `{entry, capture}` for `approve` — the posted entry and the resolved
capture in one body, so the review screen advances without a second read.

### 2.3 The queue the worker fills

A due recurring rule appears here as `kind: "recurring"`, `status: "pending"`, with a
sealed draft carrying `recurring_rule_ref`, `payee_ref`, `account_ref`, `category_ref`,
`amount_minor`, `currency`, `due_on` — exactly the fields the approve call needs, pre-filled.
Approving it posts with `recurring_rule_id` set, and the unique index
`(recurring_rule_id, occurred_on)` is what makes a double tap impossible. Details in
[F5](./05-recurring.md).

### 2.4 Mail intake

| # | call | notes |
| --- | --- | --- |
| 1 | `GET /api/connections` | is a mailbox authorised at all |
| 2 | `GET /api/intake` | `{"enabled":false,"allowlist":[]}` on a fresh instance |
| 3 | `PATCH /api/intake {"enabled":true,"allowlist":["bank.example"]}` | entries are matched as lowercased **substrings** of `From`, up to 50 of them |
| 4 | `POST /api/intake/run` | `{"created":1,"skipped":0,"failed":0,"unchanged":0}` |
| 5 | `GET /api/intake/messages?status=captured` | the reference per mail: `source`, `handle`, `status`, `received_at`, `observed_at`, `last_synced_at` |
| 6 | `POST /api/intake/messages/{ref}/refresh` | a newer revision becomes a **new** row (the old one gets `superseded_by`); a deleted mail is marked `gone` |

A run is bounded on purpose: the window is the last 72h and one run handles at most 50
messages, so a backlog drains over ticks instead of hammering the mailbox. `skipped`
means an allowlist miss, an empty body or a dedupe hit; `409 intake_disabled` means
polling is off. Only a `text/plain` body becomes `raw_text` today — attachments are not
captured yet.

## 3. Backend, end to end

```
POST /api/captures        Handler.Captures.Create → Module.Captures.Create
                          → sealer.Seal(raw_text) → Repository.Sqlite.InsertCapture
                          → Filestore.Put(bytes) → artifacts row → Captures.Extract (vendor)
GET  /api/captures        Handler.Captures.List   → Module.Captures.List (unseals payloads)
PATCH/api/captures/{ref}  Handler.Captures.Patch  → Module.Captures.Approve
                          → entity.Capture.Transition → Module.Ledger.Post
                          → Repository.Sqlite.UpdateCapture (+ audit)
                        → Module.Captures.Reject / Retry
GET  …/artifact           Handler.Captures.Artifact → ArtifactByCaptureRef → Filestore.Open
                          (AES-256-GCM, plaintext sha as AAD, gunzip when stored gzipped)
POST /api/intake/run      Handler.Intake.Run → Module.Intake.Poll → Repository.Mailbox.Fetch
                          → Module.Captures.Create per accepted message
                          → Repository.Sqlite.InsertMailMessage
```

- **The state machine is enforced, not documented.** `entity.captureTransitions`:
  `extracting → pending|failed`, `failed → pending|extracting|rejected`,
  `pending → approved|rejected|duplicate`, `duplicate → pending`, `approved → ∅`,
  `rejected → pending`. Anything else is `409 invalid_state`; a decision on an already
  decided row is `409 capture_resolved`.
- **Approve is a ledger write with a paper trail.** It runs `Module.Ledger.Post`
  (the same zero-sum, FX and idempotency path as `POST /api/entries`), then stamps
  `resolved_entry_id`, `resolved_at` and status in a second step, and appends
  `capture/approve` to the journal with the acting token in `actor_ref`.
- **The artifact is outside the database.** Bytes live at
  `./data/artifacts/<sha[0:2]>/<sha[2:4]>/<sha256>`, gzipped when compressible, encrypted
  with a key derived from `APP_SECRET`; the `artifacts` row keeps metadata only. A
  deleted file is a missing document, never a broken capture — the route answers `404`
  (gone from disk) or `410` (`deleted_at` stamped by the worker).
- **The mail reference is content-free.** `mail_messages` stores the provider handle,
  thread, revision and outcome; the body stays sealed in `captures.raw_text`. That is why
  a listing never leaks an email and `refresh` can be honest about what changed.

## 4. RRR

### Requirements

1. A capture call must succeed with **no account, no category and no amount** — one
   photograph or one pasted string is a complete request.
2. The same bytes twice must produce one row. Dedupe is a UNIQUE index on a hash of
   `(kind, client_id, artifact_hash, raw_text)`, so a retried share is `200`, not a twin.
3. No capture transition may reach `approved` except through a ledger post that passes
   `entity.CheckZeroSum` twice (before the insert and inside the transaction).
4. A resolved capture is immutable: `approve`/`reject` on it is `409 capture_resolved`,
   and only `retry` (on `failed`) can move a row forward again.
5. The receipt must be downloadable byte for byte, or answer `410 gone` after retention —
   never a silent `404` for a file the worker reclaimed.
6. Rejecting keeps evidence: the row, the sealed reason and the artifact (until
   retention) all survive. Nothing is deleted.
7. A mail that becomes a capture is traceable both ways: `mail_messages.capture_id`
   points forward, the review queue shows the capture. A refresh produces a new capture
   and never mutates the old one.
8. Capture payloads are sealed at rest; a client can never observe a plaintext column.

### Risks

| risk | why it hurts | mitigation |
| --- | --- | --- |
| vendor outage mid-extraction | the user's receipt sits in `extracting` or `failed` with an `extraction_error` | the row is still there and still approvable by hand: `approve` does not need the vendor, it needs the postings the user typed |
| `retry` on a never-submitted capture | confusing "why does retry fail" for the user | it is `409 invalid_state` because there is no `job_ref`; the UI should hide retry unless `status = failed` **and** `job_ref` is non-empty |
| an approve names a payee that does not exist | the approval is refused after the user has picked everything | it is `404 not_found`, the capture stays `pending`, and the client resolves the ref from `GET /api/payees?query=` first |
| duplicate receipts across channels | the same email and the same photo would double-count | the dedupe key includes `kind`, so identical bytes through two channels are two rows — intentionally: they are two pieces of evidence. The ledger only ever sees the one the user approves |
| one artifact per capture | a multi-page statement cannot be one capture | `UNIQUE (capture_id)` on artifacts; a statement is imported through [F6](./06-statement-import.md) instead |
| allowlist is a substring match | `example` accepts `evil-example.net` | the setting screen must show the match rule verbatim, and the docs say "keep entries specific"; an empty allowlist means *everyone* once polling is on |

### Rollout

1. **Ship the shortcut before the review screen.** `POST /api/captures` with
   `kind: "share"` and a `client_id` is useful on day one — captures accumulate, nothing
   lands in the ledger, nothing can be corrupted.
2. **Ship the review queue next**, reading `GET /api/captures` and writing `approve` /
   `reject`. Keep the artifact viewer behind the queue: it is the most expensive call
   (decrypt + stream) and the least frequent.
3. **Ship mail intake last.** It depends on a Google or IMAP authorisation (F1 §2.3) and
   on an allowlist the user understands; enable it with `PATCH /api/intake` only after a
   manual `POST /api/intake/run` returned `created > 0` with zero `failed`.
4. Rollback is disabling intake (`{"enabled":false}`) and hiding the queue: captures
   already approved are ordinary ledger entries and need no migration.

## 5. Acceptance criteria

```gherkin
Scenario: A share becomes one capture, and a replay does not duplicate it
  When I send a POST to "/api/captures" with:
    """json
    {"client_id":"cap-1","kind":"share","raw_text":"KOPI 18.000"}
    """
  Then the response status is 201
  And the response body has status "pending"
  When I send the same POST to "/api/captures" again
  Then the response status is 200
  And the store holds 1 "captures" row

Scenario: An unknown kind is refused before anything is stored
  When I send a POST to "/api/captures" with:
    """json
    {"kind":"receipt"}
    """
  Then the response status is 422
  And the error code is "unknown_capture_kind"

Scenario: Approving a capture posts one entry and resolves the capture
  Given a pending capture "receipt"
  When I send a PATCH to "/api/captures/{{ref}}" with:
    """json
    {"action":"approve","occurred_on":"2026-02-14","currency":"IDR",
     "postings":[{"account_ref":"{{account:Cash}}","amount_minor":"-18000"},
                 {"account_ref":"{{account:Unsorted}}","amount_minor":"18000"}]}
    """
  Then the response status is 201
  And the response body carries "entry" and "capture"
  And the capture status is "approved"
  And the store holds 1 "ledger_entries" row
  And the journal holds 1 "capture" row with action "approve"

Scenario: Unbalanced postings are refused and the capture stays pending
  Given a pending capture "receipt"
  When I send a PATCH to "/api/captures/{{ref}}" with postings that do not sum to zero
  Then the response status is 422
  And the error code is "postings_not_balanced"
  And the capture status is still "pending"

Scenario: A decided capture cannot be decided twice
  Given an approved capture "receipt"
  When I send a PATCH to "/api/captures/{{ref}}" with:
    """json
    {"action":"reject","reason":"changed my mind"}
    """
  Then the response status is 409
  And the error code is "capture_resolved"

Scenario: The receipt downloads and then reports retention honestly
  Given a capture with an artifact
  When I send a GET to "/api/captures/{{ref}}/artifact"
  Then the response status is 200
  And the body is the uploaded bytes
  When the worker reclaims that artifact
  And I send a GET to "/api/captures/{{ref}}/artifact"
  Then the response status is 410
  And the error code is "gone"

Scenario: Intake is off until it is configured
  When I send a POST to "/api/intake/run"
  Then the response status is 409
  And the error code is "intake_disabled"
  When I send a PATCH to "/api/intake" with:
    """json
    {"enabled":true,"allowlist":["Bank.Example"]}
    """
  Then the response status is 200
  And the stored allowlist is "bank.example"
```

## 6. What this page does not promise

- No `batch_id` filter on the queue, no unread counts, no push.
- `extracted` (a provider pushing a draft) is not implemented. A capture is resolved by
  `approve`, `reject` or `match`; there is no action that edits the entry it produced.
- No PDF parsing, no vendor-side draft push (`extracted`), no completeness gate.
- Mail attachments are not captured; only a `text/plain` body becomes `raw_text`.
