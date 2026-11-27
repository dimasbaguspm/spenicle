# Docs alignment

The docs are checked against the code, never the other way round: a page is aligned when
every route, field, limit, status code and error code it names is what the tree actually
does. A check is recorded here once, with the commit it was run on and a release verdict.
Append a row per check; never rewrite a past one.

| checked (UTC) | commit | branch | checked by | scope | verdict |
| --- | --- | --- | --- | --- | --- |
| 2026-11-27T04:08Z | `2fdf1ef3f3293eed8f43da32b277ed9779fe08dc` | `main` | Dimas Mukti (PI-Desktop agent) | every file under `docs/`, plus `README.md` and `AGENTS.md` | **GO** |

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
  - the `running_balances` derivation and `CheckZeroSum` ordering described as something
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
