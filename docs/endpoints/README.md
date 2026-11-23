# Endpoints

One file per route. Every file answers the same questions in the same order:

`Auth` · `Purpose` · `Upstream` · `Downstream` · `Path / query params` · `Body` ·
`Response` · `Errors` · `Limitations` · `Sequence` (mermaid).

Nothing is planned-but-unbuilt right now; the decisions that shaped the routes are in [`planned.md`](./planned.md).

| method | path | purpose | file |
| --- | --- | --- | --- |
| `GET` | `/healthz` | liveness, build and schema fingerprint | [`GET_healthz.md`](./GET_healthz.md) |
| `POST` | `/api/session` | exchange the password for a cookie | [`POST_api_session.md`](./POST_api_session.md) |
| `DELETE` | `/api/session` | sign out: clear the cookie | [`DELETE_api_session.md`](./DELETE_api_session.md) |
| `POST` | `/api/password` | replace the generated password | [`POST_api_password.md`](./POST_api_password.md) |
| `GET` | `/api/settings` | the in-app settings the shell reads | [`GET_api_settings.md`](./GET_api_settings.md) |
| `PATCH` | `/api/settings` | change the base currency while the ledger is empty | [`PATCH_api_settings.md`](./PATCH_api_settings.md) |
| `GET` | `/api/meta` | bootstrap payload: settings, accounts, currencies | [`GET_api_meta.md`](./GET_api_meta.md) |
| `GET` | `/api/accounts` | every account with the balance the ledger implies | [`GET_api_accounts.md`](./GET_api_accounts.md) |
| `POST` | `/api/accounts` | create an account or a category | [`POST_api_accounts.md`](./POST_api_accounts.md) |
| `PATCH` | `/api/accounts/{ref}` | rename, re-icon, archive an account | [`PATCH_api_accounts_ref.md`](./PATCH_api_accounts_ref.md) |
| `POST` | `/api/payees` | create a payee with optional defaults | [`POST_api_payees.md`](./POST_api_payees.md) |
| `PATCH` | `/api/payees/{ref}` | rename, re-default, archive a payee | [`PATCH_api_payees_ref.md`](./PATCH_api_payees_ref.md) |
| `GET` | `/api/payees` | every payee with its default accounts | [`GET_api_payees.md`](./GET_api_payees.md) |
| `GET` | `/api/recurring` | every recurring rule, soonest due first | [`GET_api_recurring.md`](./GET_api_recurring.md) |
| `POST` | `/api/recurring` | create a recurring rule | [`POST_api_recurring.md`](./POST_api_recurring.md) |
| `PATCH` | `/api/recurring/{ref}` | steer a recurring rule | [`PATCH_api_recurring_ref.md`](./PATCH_api_recurring_ref.md) |
| `GET` | `/api/entries` | list the ledger, newest first | [`GET_api_entries.md`](./GET_api_entries.md) |
| `POST` | `/api/entries` | post one balanced entry | [`POST_api_entries.md`](./POST_api_entries.md) |
| `PATCH` | `/api/entries/{ref}` | void an entry (write its reversal) | [`PATCH_api_entries_ref.md`](./PATCH_api_entries_ref.md) |
| `GET` | `/api/captures` | the review queue | [`GET_api_captures.md`](./GET_api_captures.md) |
| `POST` | `/api/captures` | park something unconfirmed | [`POST_api_captures.md`](./POST_api_captures.md) |
| `PATCH` | `/api/captures/{ref}` | approve, reject or retry a capture | [`PATCH_api_captures_ref.md`](./PATCH_api_captures_ref.md) |
| `GET` | `/api/captures/{ref}/artifact` | download the document behind a capture | [`GET_api_captures_ref_artifact.md`](./GET_api_captures_ref_artifact.md) |
| `GET` | `/api/analytics/months` | spend and income per calendar month | [`GET_api_analytics_months.md`](./GET_api_analytics_months.md) |
| `GET` | `/api/analytics/categories` | spend per category for a range | [`GET_api_analytics_categories.md`](./GET_api_analytics_categories.md) |
| `POST` | `/api/analytics/custom` | save a named analytics view | [`POST_api_analytics_custom.md`](./POST_api_analytics_custom.md) |
| `PATCH` | `/api/analytics/custom/{ref}` | rename or re-chart a saved view | [`PATCH_api_analytics_custom_ref.md`](./PATCH_api_analytics_custom_ref.md) |
| `GET` | `/api/analytics/custom/{ref}` | run a saved view over a window | [`GET_api_analytics_custom_ref.md`](./GET_api_analytics_custom_ref.md) |
| `GET` | `/api/dashboard` | the landing tiles in one response | [`GET_api_dashboard.md`](./GET_api_dashboard.md) |
| `POST` | `/api/setup` | open the ledger with a base currency | [`POST_api_setup.md`](./POST_api_setup.md) |
| `GET` | `/api/rates` | the cached ECB reference rate for one day | [`GET_api_rates.md`](./GET_api_rates.md) |
| `GET` | `/api/export` | the whole ledger as one JSON document or a zip of CSV sheets | [`GET_api_export.md`](./GET_api_export.md) |

