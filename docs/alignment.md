# Docs alignment

The docs are checked against the code, never the other way round: a page is aligned when
every route, field, limit, status code and error code it names is what the tree actually
does. A check is recorded here once, with the commit it was run on and a release verdict.
Append a row per check; never rewrite a past one.

| checked (UTC) | commit | branch | checked by | scope | verdict |
| --- | --- | --- | --- | --- | --- |
| 2026-11-27T04:08Z | `2fdf1ef3f3293eed8f43da32b277ed9779fe08dc` | `main` | Dimas Mukti (PI-Desktop agent) | every file under `docs/`, plus `README.md` and `AGENTS.md` | **GO** |
| 2026-11-27T11:35Z | `2fdf1ef3` + the code fixes in this change | `main` | Dimas Mukti (PI-Desktop agent) | the ten product-deck features against the code and the UAT suite | **GO** |
| 2026-11-27T15:20Z | `59ee5c9` + the ledger-group refactor and the new scenarios in this change | `main` | Dimas Mukti (PI-Desktop agent) | every deck clause that was listed as "untested", one UAT scenario each | **GO** |
| 2026-11-27T16:40Z | `ec127d1` + the captures-group refactor in this change | `main` | Dimas Mukti (PI-Desktop agent) | captures, payloads, artifacts and mail messages by ref, plus the mail→capture link | **GO** |
| 2026-11-27T17:30Z | `de7d06b` + the imports/exports/journal refactor in this change | `main` | Dimas Mukti (PI-Desktop agent) | the last integer relations: import rows, import/export events, upload chunks, `audit_log.entity_id` | **GO** |
| 2026-11-27T18:10Z | `ad2a822` + the `idempotency_key` rename in this change | `main` | Dimas Mukti (PI-Desktop agent) | no `*_id` column left in the schema, wire and code (Google OAuth `client_id` excepted: it is Google's field) | **GO** |
| 2026-11-27T19:05Z | `ec2237c` + the limits, currencies and index pass in this change | `main` | Dimas Mukti (PI-Desktop agent) | the eight limit overrides, the full ISO 4217 table, the index audit | **GO** |
| 2026-11-27T19:40Z | `ebf4347` + the request-id and date-parser pass in this change | `main` | Dimas Mukti (PI-Desktop agent) | one date parser for every `from`/`to`, `X-Request-Id` on every response, `trace_id` on `5xx` | **GO** |
| 2026-11-27T20:05Z | `d61a15b` + the frozen-rate test and the suggestion memo | `main` | Dimas Mukti (PI-Desktop agent) | a locked posting keeps its rate; one lookup per draft for the fallback category | **GO** |
| 2026-11-27T22:05Z | uncommitted (the OpenAPI document in this change) | `main` | Dimas Mukti (PI-Desktop agent) | `openapi.json` against the 59 routes in `cmd/http/handler.go`, the group and scope of each, and the `validate`, `pattern`, `format` and `enums` tags on the structs it publishes | **GO** |

## What a check covers

1. **Routes, one by one.** The 59 patterns in `cmd/http/handler.go` (`routes` and
   `credentialRoutes`) against `docs/endpoints/README.md` and the 59 pages: same method,
   same path, same group, same scope. No phantom route, no undocumented one.
2. **Request shapes.** Every body, query and path field against the `validate:"…"` tags
   on the structs the handlers bind — names, required-ness, minima, maxima, enums.
3. **Responses.** Every documented status code and JSON key against the response structs
   and the recorded bodies in `uat/snapshots/api/`.
4. **Errors.** Every `code` string against `writeInvalid`, the validation code table in
   `internal/common/validating` and `errorMappings` in `cmd/http/handlers/entries.go`.
5. **Limitations.** Retention windows, caps, chunk sizes, state machines and "not
   shipped" claims against the modules, the worker and `internal/common/config`.
6. **Everything else.** `docs/v2-api.md` (schema and target API against the migrations),
   `docs/v2-design.md`, `docs/observability.md` (spans, metrics, attributes), the product
   deck, `README.md`, `AGENTS.md` and `.env.example`.

## What the 2026-11-27 check found

- Route coverage was already exact: 59 routes, 59 index rows, 59 files, 1:1.
- 53 files disagreed with the code in at least one place; all corrected in the same
  change, and not one line of Go touched. The recurring defects, by kind:
  - a `limit` described as "clamped" where the binder rejects a value over 200 with `422`;
  - `next_cursor` described as "omitted on an empty page" where it is omitted whenever
    there is no next page;
  - `422 invalid_request` where the promoted code is `unknown_currency`, and the reverse;
  - missing `409 duplicate` on the three routes whose SQL carries a unique index;
  - a duplicate-name collision documented as `500` where the mapper answers `409`;
  - the `entry_balances` derivation and `CheckZeroSum` ordering described as something
    the code does not do;
  - `POST /api/recurring` claiming the scheduler is unimplemented when the worker
    advances `next_due_on` every tick;
  - imports: the real 11 MiB multipart ceiling, the `committing` batch state and its
    events, and the fixed order of `edited_fields`;
  - captures: `capture_resolved` vs `invalid_state`, and the payee lookup sitting in the
    handler after approval, not in the module;
  - top-level: a `spn_` token prefix (real prefix `spl_`), four of eight environment
    variables, an inert `ai_assistance` that is in fact computed and served, a worker
    described as one stage when it runs six, a `settings`/`fx_rates` DDL that does not
    match the migration, and a dashboard promising a safe-to-spend tile that is not
    shipped.
- Since the shared answers were missing from every page, the credential groups, open
  mode and the `409 password_change_required` gate now live once in
  [`docs/endpoints/README.md`](./endpoints/README.md).

## Verdict rules

- **GO** — no doc statement contradicts the code, the four lint groups are clean and the
  test suite passes on that commit. The row above records exactly that: `make lint` and
  `make test` green on `2fdf1ef3` with these edits applied (the edits are Markdown only,
  so they cannot move either result). What is planned but unshipped is listed in
  [`docs/endpoints/planned.md`](./endpoints/planned.md) and
  [`docs/product-deck/features/09-gaps-and-next.md`](./product-deck/features/09-gaps-and-next.md),
  not hidden in an endpoint page.
- **NO GO** — a route, field, status or code in a doc that the code does not do; or a
  shipped capability the docs still call planned. Fix the page (or the code and the page
  together), then run the check again and append a new row.

## Re-running it

```bash
git switch main && git pull --ff-only
git rev-parse HEAD                      # the commit the row records
grep -cE '"(GET|POST|PATCH) ' cmd/http/handler.go   # routes, against the index rows
make lint && make test && make uat
```

The four lint groups and the two test suites prove the commit itself is sound; the row
above is only worth reading next to a green tree. `make uat` needs Docker: run it before a
release, not after every docs edit.

## Feature readiness — the ten features

Each row is one page of [`docs/product-deck/features/`](./product-deck/features/README.md).
"Proven" means a committed UAT scenario asserts the clause; "untested" means the code does
it and nothing fails if it stops doing it.

| # | feature | state | proven | untested clause |
| --- | --- | --- | --- | --- |
| F1 | access and bootstrap | **GO** | 9 of 9 clauses — setup, currency lock, password gate, tokens, revoke, and the `403` that names the scope a token lacks (`post_api_tokens__a_capture_token_cannot_approve`) | the `?status=revoked` listing filter |
| F2 | capture inbox | **GO** | approve, reject, retry, match, dedupe, intake allowlist, the artifact answering `410` once the worker reclaims it (`get_api_captures_artifact__a_reclaimed_artifact_answers_410`), and a captured mail naming its capture (`get_api_intake_messages__a_captured_mail_names_its_capture`) | the journal row's `action` is asserted by kind only |
| F3 | ledger | **GO** | 8 of 8 — zero-sum, FX, reverse writes its reversal, balances hold, and the journal records both entries by ref (`patch_api_entries_:ref__reversing_writes_a_reversal_and_keeps_the_original`) | the entry body still does not carry `reversal_of_ref`; the journal does |
| F4 | accounts and payees | **GO** | create, archive, rename, defaults, `409 duplicate`, and a `kind` change answered `400 invalid_json` (`patch_api_accounts_:ref__a_kind_change_is_refused_as_unknown`) | archiving keeps the posting on its entry (no step) |
| F5 | recurring | **GO** | queue, dedupe, catch-up cap, pause, and the rule that survives in the capture's `draft_json` | the entry cannot name the rule: it is a ref on the capture, not on the entry |
| F6 | statement import | **GO** | clash kinds, commit, reject, chunk assembly, suggestions on both upload paths, and the reject reason kept on the event (`get_api_imports_ref_events__a_reject_keeps_its_reason`) | nothing |
| F7 | insights | **GO** | dashboard tiles, month series, saved views, window validation, and an empty window omitting the `months` key (`get_api_analytics_custom_ref__a_window_with_no_rows_omits_months`) | category ordering on a tie |
| F8 | export | **GO** | queue, worker render, download, events, retention | the per-file `sha256` in the manifest |
| F9 | gaps and next | n/a | the list itself: every "not shipped" row was checked against the tree | — |
| F10 | categories | **GO** | tiers, archived-category skip, rule caps, suggestions | the archived-category scenario asserts the wrong tier |

Two entry fields the deck used to promise (`reverses_entry_id`, `recurring_rule_id`) do not
exist and must not: they would be integer ids. The deck now states what the code does, and
[`docs/plan/refs-and-idempotency.md`](./plan/refs-and-idempotency.md) is where the ref-shaped
replacement lands.
