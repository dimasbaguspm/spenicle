# Endpoints

One file per route. Every file answers the same questions in the same order:

`Auth` · `Purpose` · `Upstream` · `Downstream` · `Path / query params` · `Body` ·
`Response` · `Errors` · `Limitations` · `Sequence` (mermaid).

Planned and deliberately unshipped decisions are in [`planned.md`](./planned.md); the live routes are all listed below.

The machine-readable form of these pages is [`openapi.json`](../../openapi.json) at the
repo root, OpenAPI 3.1: one operation per route, carrying the group, the scope and the
credential scheme the route table declares. It is generated — `make openapi` — from the
annotation block above each handler and joined with `cmd/http/handler.go`; never edit it
by hand, and change the page here when you change the block.
| method | path | purpose | file |
| --- | --- | --- | --- |
| `GET` | `/api/connections` | current Google mailbox connection, or `disconnected` | [`GET_api_connections.md`](./GET_api_connections.md) |
| `GET` | `/api/connections/google/callback` | finish the Google grant from the browser redirect (public) | [`GET_api_connections_google_callback.md`](./GET_api_connections_google_callback.md) |
| `POST` | `/api/connections/google` | store OAuth client credentials and start authorisation | [`POST_api_connections_google.md`](./POST_api_connections_google.md) |
| `POST` | `/api/connections/{ref}/revoke` | disconnect the stored grant, keep the row | [`POST_api_connections_ref_revoke.md`](./POST_api_connections_ref_revoke.md) |
| `GET` | `/healthz` | liveness, build and schema fingerprint | [`GET_healthz.md`](./GET_healthz.md) |
| `POST` | `/api/password` | replace the generated password | [`POST_api_password.md`](./POST_api_password.md) |
| `GET` | `/api/settings` | the in-app settings the shell reads | [`GET_api_settings.md`](./GET_api_settings.md) |
| `PATCH` | `/api/settings` | discover that no setting is patchable | [`PATCH_api_settings.md`](./PATCH_api_settings.md) |
| `GET` | `/api/meta` | bootstrap payload: settings, accounts, payees, recurring rules, currencies | [`GET_api_meta.md`](./GET_api_meta.md) |
| `GET` | `/api/accounts` | every account with the balance the ledger implies | [`GET_api_accounts.md`](./GET_api_accounts.md) |
| `POST` | `/api/accounts` | create an account or a category | [`POST_api_accounts.md`](./POST_api_accounts.md) |
| `PATCH` | `/api/accounts/{ref}` | rename, re-icon, reparent, archive an account | [`PATCH_api_accounts_ref.md`](./PATCH_api_accounts_ref.md) |
| `POST` | `/api/payees` | create a payee with optional defaults | [`POST_api_payees.md`](./POST_api_payees.md) |
| `PATCH` | `/api/payees/{ref}` | rename, re-default, archive a payee | [`PATCH_api_payees_ref.md`](./PATCH_api_payees_ref.md) |
| `GET` | `/api/payees` | every payee with its default accounts | [`GET_api_payees.md`](./GET_api_payees.md) |
| `GET` | `/api/recurring` | every recurring rule, soonest due first | [`GET_api_recurring.md`](./GET_api_recurring.md) |
| `POST` | `/api/recurring` | create a recurring rule | [`POST_api_recurring.md`](./POST_api_recurring.md) |
| `PATCH` | `/api/recurring/{ref}` | steer a recurring rule | [`PATCH_api_recurring_ref.md`](./PATCH_api_recurring_ref.md) |
| `GET` | `/api/entries` | list the ledger, newest first | [`GET_api_entries.md`](./GET_api_entries.md) |
| `POST` | `/api/entries` | post one balanced entry | [`POST_api_entries.md`](./POST_api_entries.md) |
| `PATCH` | `/api/entries/{ref}` | reverse an entry (write its reversal) | [`PATCH_api_entries_ref.md`](./PATCH_api_entries_ref.md) |
| `GET` | `/api/entries/{ref}` | one entry with its postings | [`GET_api_entries_ref.md`](./GET_api_entries_ref.md) |
| `GET` | `/api/captures` | the review queue | [`GET_api_captures.md`](./GET_api_captures.md) |
| `POST` | `/api/captures` | park something unconfirmed | [`POST_api_captures.md`](./POST_api_captures.md) |
| `PATCH` | `/api/captures/{ref}` | approve, reject or retry a capture | [`PATCH_api_captures_ref.md`](./PATCH_api_captures_ref.md) |
| `GET` | `/api/captures/{ref}/artifact` | download the document behind a capture | [`GET_api_captures_ref_artifact.md`](./GET_api_captures_ref_artifact.md) |
| `POST` | `/api/imports` | upload a CSV statement as a reviewable draft | [`POST_api_imports.md`](./POST_api_imports.md) |
| `GET` | `/api/imports` | every statement batch, newest first | [`GET_api_imports.md`](./GET_api_imports.md) |
| `GET` | `/api/imports/{ref}` | one batch with its rows | [`GET_api_imports_ref.md`](./GET_api_imports_ref.md) |
| `PATCH` | `/api/imports/{ref}/rows/{index}` | edit, accept or skip one drafted row | [`PATCH_api_imports_rows.md`](./PATCH_api_imports_rows.md) |
| `PATCH` | `/api/imports/{ref}` | commit the draft or reject it, one body action | [`PATCH_api_imports_ref.md`](./PATCH_api_imports_ref.md) |
| `GET` | `/api/imports/{ref}/events` | the append-only log of one batch | [`GET_api_imports_ref_events.md`](./GET_api_imports_ref_events.md) |
| `GET` | `/api/analytics/months` | spend and income per calendar month | [`GET_api_analytics_months.md`](./GET_api_analytics_months.md) |
| `GET` | `/api/analytics/categories` | spend per category for a range, optional parent roll-up | [`GET_api_analytics_categories.md`](./GET_api_analytics_categories.md) |
| `POST` | `/api/analytics/custom` | save a named analytics view | [`POST_api_analytics_custom.md`](./POST_api_analytics_custom.md) |
| `PATCH` | `/api/analytics/custom/{ref}` | rename or re-chart a saved view | [`PATCH_api_analytics_custom_ref.md`](./PATCH_api_analytics_custom_ref.md) |
| `GET` | `/api/analytics/custom/{ref}` | run a saved view over a window | [`GET_api_analytics_custom_ref.md`](./GET_api_analytics_custom_ref.md) |
| `GET` | `/api/dashboard` | the landing tiles in one response | [`GET_api_dashboard.md`](./GET_api_dashboard.md) |
| `GET` | `/api/categorization/rules` | the deterministic category rules, oldest first | [`GET_api_categorization_rules.md`](./GET_api_categorization_rules.md) |
| `POST` | `/api/categorization/rules` | teach one rule: a pattern, a field and a category | [`POST_api_categorization_rules.md`](./POST_api_categorization_rules.md) |
| `PATCH` | `/api/categorization/rules/{ref}` | repoint, reprioritise or archive a rule | [`PATCH_api_categorization_rules_ref.md`](./PATCH_api_categorization_rules_ref.md) |
| `GET` | `/api/categorization/suggest` | the category this payee or text would get, and why | [`GET_api_categorization_suggest.md`](./GET_api_categorization_suggest.md) |
| `POST` | `/api/setup` | open the ledger with a base currency and optional opening balances | [`POST_api_setup.md`](./POST_api_setup.md) |
| `GET` | `/api/rates` | the cached ECB reference rate for one day | [`GET_api_rates.md`](./GET_api_rates.md) |
| `GET` | `/api/audit` | the journal: what changed, who changed it | [`GET_api_audit.md`](./GET_api_audit.md) |
| `POST` | `/api/tokens` | mint a scoped, non-root credential (root only) | [`POST_api_tokens.md`](./POST_api_tokens.md) |
| `GET` | `/api/tokens` | every issued token, never its secret (root only) | [`GET_api_tokens.md`](./GET_api_tokens.md) |
| `POST` | `/api/tokens/{ref}/revoke` | revoke a token; the row stays (root only) | [`POST_api_tokens_ref_revoke.md`](./POST_api_tokens_ref_revoke.md) |
| `GET` | `/api/intake` | the intake configuration, never its secrets | [`GET_api_intake.md`](./GET_api_intake.md) |
| `PATCH` | `/api/intake` | turn polling on, set the sender allowlist | [`PATCH_api_intake.md`](./PATCH_api_intake.md) |
| `POST` | `/api/intake/run` | poll the mailbox once, now | [`POST_api_intake_run.md`](./POST_api_intake_run.md) |
| `GET` | `/api/intake/messages` | every mail reference, newest first | [`GET_api_intake_messages.md`](./GET_api_intake_messages.md) |
| `GET` | `/api/intake/messages/{ref}` | one mail reference and what it became | [`GET_api_intake_messages_ref.md`](./GET_api_intake_messages_ref.md) |
| `POST` | `/api/intake/messages/{ref}/refresh` | the latest state of one mail | [`POST_api_intake_messages_ref_refresh.md`](./POST_api_intake_messages_ref_refresh.md) |
| `POST` | `/api/exports` | queue an export the worker renders | [`POST_api_exports.md`](./POST_api_exports.md) |
| `GET` | `/api/exports` | every export job, newest first | [`GET_api_exports.md`](./GET_api_exports.md) |
| `GET` | `/api/exports/{ref}` | one export job and its status | [`GET_api_exports_ref.md`](./GET_api_exports_ref.md) |
| `GET` | `/api/exports/{ref}/events` | the append-only log of one job | [`GET_api_exports_ref_events.md`](./GET_api_exports_ref_events.md) |
| `GET` | `/api/exports/{ref}/download` | the rendered document or zip | [`GET_api_exports_ref_download.md`](./GET_api_exports_ref_download.md) |

## Credentials, in one place

Every route sits in one of three groups, and no page repeats the shared answers. `public`
needs no credential. `root` needs the instance password as `Authorization: Bearer
<password>`; a token never reaches it. `scoped` needs a token carrying the scope declared
on that route's own line in `cmd/http/handler.go` — a root credential may reach it too,
a token without the scope is `403 forbidden`.

- **Open mode.** Until a password is seeded the instance is unprotected: every request is
  the root credential and every scope check passes.
- **Password change gate.** While `password_must_change` is true — the generated first
  password nobody has replaced yet — every route except `POST /api/password` and
  `GET /api/meta` answers `409 password_change_required` before the handler runs.
  `/healthz` and `GET /api/connections/google/callback` sit outside it: they need no
  credential at all.
- **Two refusals, in order.** No header at all is `401 unauthorized`; a credential that
  exists but lacks the group or the scope is `403 forbidden`.

Every route answers as a span named `Handler.<Group>.<Action>` under the request's
`<method> <route pattern>` span; [`../observability.md`](../observability.md) is what that span,
the matching metric and the `trace_id` on its log lines mean.
