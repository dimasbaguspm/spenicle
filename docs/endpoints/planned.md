# Planned, not implemented

Designed in [`../v2-api.md`](../v2-api.md), no handler yet. Listed so nobody guesses.

| method | path | purpose | would touch |
| --- | --- | --- | --- |
| `POST` | `/api/setup` | wizard: currency, first account, opening balance | settings, accounts, ledger |
| `GET` | `/api/analytics/categories` | spend per category for a range, the pie namespace | ledger, accounts |
| `GET` | `/api/analytics/custom/{ref}` | a saved, configurable query plus its chart spec | ledger, custom_queries |
| `GET` | `/api/dashboard` | the five tiles in one response | ledger, recurring, captures |
| `POST` | `/api/tokens` | mint a scoped API token, secret shown once | api_tokens, settings |
| `PATCH` | `/api/tokens/{ref}` | revoke | api_tokens, audit |

Until they land, an agent should treat them as "not yet" — never as "read the database
directly".
