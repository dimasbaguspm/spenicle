# Plan: the web client

A decision record, not code. The scaffold it describes is in [`web/`](../web/README.md).

## The shape

One origin, client-side rendering, no CORS, no BFF.

```
browser ──▶ spenicle http :8080 ──┬─▶ /                the built SPA (embedded)
                                  └─▶ /api/*           the same JSON API
```

CSR decides where the HTML is rendered, not where it comes from: the page is still served by
`spenicle http`, so `/api` on that same port is same-origin. CORS is a cross-origin problem,
and there is no second origin to allow. Development gets the same shape from Vite's
`server.proxy`; the Go side stays CORS-free in every environment.

## Rejected, with the reason

| option | why not |
| --- | --- |
| Next.js / Nuxt / SSR | no crawlers, one user; a Node runtime in every container buys nothing |
| a BFF that proxies `/api` | a second trusted process on the hot path, sessions and CSRF to get right, and every export download has to be streamed through it twice |
| CORS middleware | same-origin makes it dead code; if a split deploy ever wants the browser to call `api.example.com` directly, it is `APP_CORS_ORIGINS` + one middleware, not a default |
| a `catalog`/`web` Go module | the client is static bytes and a typed HTTP client; it needs no server-side domain logic |

## The credential

1. The operator types the instance password.
2. The SPA sends it once, as `Authorization: Bearer`, to `POST /api/tokens` and receives a
   scoped `spl_…` token.
3. Only the token is stored (`sessionStorage`); the password lives in one form's state.
4. `401` clears the token and the router guard sends the next render to `/`.

A leaked browser credential is therefore a token the operator can revoke, not the root
password, and there is no cookie to make CSRF a question.

## Images: one Dockerfile, four tags

| tag | contents | serves |
| --- | --- | --- |
| `spenicle:latest` | the binary with `web/dist` embedded | `/` + `/api` on one port |
| `spenicle:server` | the same binary, [`APP_WEB=off`] | `/api`, and `/` answers 404 |
| `spenicle:web` | `dist/` + a static server that proxies `/api` | `/` + proxy |
| `spenicle:cli` | the same binary, `spenicle cli` | — |

Tags, not repositories: one release workflow, one provenance record, shared layers.

`spenicle:web` reads exactly one variable — `APP_API_URL`, default `http://127.0.0.1:8080`.
A same-pod deployment needs nothing; a split one names the API's service or host. The proxy is
always server-side, so the browser stays on one origin even when the two containers are apart.

## Screens → endpoints (all already shipped)

| screen | route | endpoints |
| --- | --- | --- |
| sign in | `/` | `POST /api/tokens` |
| register + quick capture | `/ledger` | `GET /api/meta`, `GET /api/entries`, `POST /api/entries` |
| capture inbox | `/captures` | `GET /api/captures` (approve/reject next) |
| import review | `/imports` | `POST /api/imports`, `PATCH /api/imports/{ref}`, `…/rows/{index}` |
| insights | `/insights` | `GET /api/analytics/months`, `…/categories`, `GET /api/dashboard` |
| exports | `/exports` | `POST /api/exports`, `GET /api/exports/{ref}`, `…/download` |
| settings | `/settings` | `GET /api/settings`, `PATCH /api/settings`, `POST /api/password`, `/api/tokens` |

## Offline

The PWA caches the shell and never caches `/api` (`navigateFallbackDenylist` keeps the API out
of the navigation fallback). Queued captures in IndexedDB come next: the product already
separates *capture* from *ledger*, so an offline capture is the same object as an online one,
just not sent yet.

## Local-first: not Zero, yet

Zero (Rocicorp) is the best local-first sync engine there is, and it does not fit this
backend. `zero-cache` replicates from **Postgres** — logical replication, or a custom
`zero-cache` writing into Postgres. Spenicle's only database is a SQLite file, and the
invariant is one container, one file, one writer. Adopting Zero would mean a second database
and a design-doc change, for a single-user ledger whose sync unit is "a draft capture", not a
collaborative document.

The product already has the shape that makes local-first cheap: **capture is not ledger**. So
the plan is an outbox, not a replicator:

1. the capture form writes to IndexedDB with a client-minted `idempotency_key` (the API mints
   one when absent and replays it, so a retry is free),
2. a background sync posts each queued capture and drops it on `2xx`,
3. reads stay TanStack Query over the PWA cache — there is no replica to reconcile.

That is offline capture without a second source of truth. Revisit Zero when the trigger
arrives: *someone else must see my write before I sync*.

## Toolchain

pnpm (pinned in `packageManager` and in `mise.toml`, `.npmrc` committed, postinstall scripts
granted one package at a time), oxfmt, tsgo for `tsc` parity at native speed, vitest, and
oxlint with warnings denied: correctness/suspicious/perf as error categories, then ~45
curated rules across react, typescript, unicorn, import, promise, jsx-a11y, vitest and node.
`make web-check` runs all four, and `lefthook.yml` calls it on any `web/**` change in both
pre-commit and pre-push.

## Theme

`web/src/styles.css` is the whole design system: ink black, porcelain cream, lacquer cherry,
brass glow as brand ramps; jade, amber, oxblood, verdigris, lapis for success, warning,
danger, tertiary and info; and semantic aliases (`surface`, `border`, `text`, `primary`,
`accent`) that screens use instead of reaching into a ramp.

## Open

- `APP_WEB=off` and the embed step are not wired yet: `spenicle http` does not serve `/` today.
- Capture approval, import review, exports, insights and settings are screens, not endpoints.
- Offline queue and background sync.
