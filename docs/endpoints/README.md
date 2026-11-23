# Endpoints

One file per route. Every file answers the same questions in the same order:

`Auth` · `Purpose` · `Upstream` · `Downstream` · `Path / query params` · `Body` ·
`Response` · `Errors` · `Limitations` · `Sequence` (mermaid).

A route that is designed but not built lives in [`planned.md`](./planned.md).

| method | path | purpose | file |
| --- | --- | --- | --- |
| `GET` | `/healthz` | liveness, build and schema fingerprint | [`GET_healthz.md`](./GET_healthz.md) |
| `POST` | `/api/session` | exchange the password for a cookie | [`POST_api_session.md`](./POST_api_session.md) |
| `DELETE` | `/api/session` | sign out: clear the cookie | [`DELETE_api_session.md`](./DELETE_api_session.md) |
| `POST` | `/api/password` | replace the generated password | [`POST_api_password.md`](./POST_api_password.md) |
| `GET` | `/api/settings` | the in-app settings the shell reads | [`GET_api_settings.md`](./GET_api_settings.md) |
| `PATCH` | `/api/settings` | change the base currency while the ledger is empty | [`PATCH_api_settings.md`](./PATCH_api_settings.md) |
| `GET` | `/api/meta` | bootstrap payload: settings, accounts, currencies | [`GET_api_meta.md`](./GET_api_meta.md) |
| `POST` | `/api/accounts` | create an account or a category | [`POST_api_accounts.md`](./POST_api_accounts.md) |
| `PATCH` | `/api/accounts/{ref}` | rename, re-icon, archive an account | [`PATCH_api_accounts_ref.md`](./PATCH_api_accounts_ref.md) |
| `POST` | `/api/payees` | create a payee with optional defaults | [`POST_api_payees.md`](./POST_api_payees.md) |
| `PATCH` | `/api/payees/{ref}` | rename, re-default, archive a payee | [`PATCH_api_payees_ref.md`](./PATCH_api_payees_ref.md) |
| `POST` | `/api/recurring` | create a recurring rule | [`POST_api_recurring.md`](./POST_api_recurring.md) |
| `PATCH` | `/api/recurring/{ref}` | steer a recurring rule | [`PATCH_api_recurring_ref.md`](./PATCH_api_recurring_ref.md) |
| `GET` | `/api/entries` | list the ledger, newest first | [`GET_api_entries.md`](./GET_api_entries.md) |
| `POST` | `/api/entries` | post one balanced entry | [`POST_api_entries.md`](./POST_api_entries.md) |
| `PATCH` | `/api/entries/{ref}` | void an entry (write its reversal) | [`PATCH_api_entries_ref.md`](./PATCH_api_entries_ref.md) |
| `GET` | `/api/captures` | the review queue | [`GET_api_captures.md`](./GET_api_captures.md) |
| `POST` | `/api/captures` | park something unconfirmed | [`POST_api_captures.md`](./POST_api_captures.md) |
| `PATCH` | `/api/captures/{ref}` | approve, reject or retry a capture | [`PATCH_api_captures_ref.md`](./PATCH_api_captures_ref.md) |
| `GET` | `/api/rates` | the cached ECB reference rate for one day | [`GET_api_rates.md`](./GET_api_rates.md) |

