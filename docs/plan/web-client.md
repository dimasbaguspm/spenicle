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

## Components

`web/src/components` is split into four layers, and composition only ever runs downhill:
**primitives → ui → widgets → layouts → a page**. `oxlint` carries one
`no-restricted-imports` override per layer, so reaching up (`ui/` into `primitives/` is fine,
`primitives/` into `ui/` is not) is a lint error that names the direction, and `@ark-ui/*` stays
unreachable outside `primitives/`.

- `primitives/` — the lowest UI layer: Ark headless wiring plus our palette. One folder per
  component (`button/index.tsx`), a private props type, exactly one export, cva variants merged
  by `tailwind-merge`, a barrel at `primitives/index.ts`. Behaviour is Ark UI's (field
  association, listbox, focus trap, roving focus, page-range math); the props, the markup and
  every token are ours, and none of them carries business logic — a screen decides what the value
  means, the primitive only decides how a value is chosen and shown.
- `ui/` — domain-agnostic presentation built from primitives. Today that is the form layer
  (`ui/form/`).
- `widgets/` — a page-level composition: a section a page drops in, given its data and nothing
  else. `CaptureList` is the first; a widget never fetches and never routes.
- `layouts/` — structure only: chrome, navigation, the outlet. `AppShell` is the only one.

Adding a primitive means: write the folder, re-export it, then use it.

66 primitives, grouped by the job a screen hires them for:

| group | components |
| --- | --- |
| text and form scaffolding | `Text` (h1–h6, p, span, label, pre, code, …), `Icon`, `Field`, `Fieldset`, `HiddenInput` |
| actions | `Button` (`tone`, `size`, `loading`, leading/trailing icon), `ButtonGroup`, `SplitButton` |
| text entry | `TextInput`, `EmailInput`, `PasswordInput`, `TextAreaInput`, `NumberInput`, `DateInput`, `DateTimeInput`, `DatePicker`, `Editable` |
| choice and value picking | `Checkbox`, `RadioGroup`, `SwitchInput`, `Toggle`, `ToggleGroup`, `SegmentGroup`, `SelectInput`, `Combobox`, `Listbox`, `PinInput`, `TagsInput`, `Slider`, `AngleSlider`, `RatingGroup`, `ColorPicker`, `FileUpload`, `SignaturePad` |
| overlay | `Dialog`, `Drawer`, `Popover`, `HoverCard`, `Tooltip`, `Menu`, `NavigationMenu`, `Toaster` |
| status | `Progress` (linear and circle), `Timer`, `QrCode`, `Clipboard`, `Highlight`, `Marquee`, `Swap`, `DownloadTrigger` |
| structure and data | `Accordion`, `Collapsible`, `Tabs`, `Steps`, `ScrollArea`, `Splitter`, `Carousel`, `Avatar`, `Pagination`, `TreeView`, `JsonTreeView`, `Toc`, `FloatingPanel`, `ImageCropper` |

Icons are `lucide-react` and nothing else: `size-4` (`size-3` where the row is dense),
`strokeWidth={1.75}`, `aria-hidden`, colour from the parent's `text-*` token. A character glyph
is a font dependency and an unstylable shape, so none survived; where one carried meaning it
moved to the trigger's `aria-label`.

Two deliberate exceptions to "one component per file": `control/index.ts` exports the shared cva
that every input wears (so an input cannot drift from its neighbours) and `toaster/index.ts`
exports the imperative `toast` store that `Toaster` reads — a store is not a component.

## Forms

`components/ui/form/` is where the app's form layer lives and the only place `react-hook-form` is
meant to be imported. One caller still holds out — `routes/ledger.tsx` uses `useForm` directly
because it preselects the first account once the meta query lands and resets two fields on a
successful post; migrating it needs `Form` to hand the instance to `onSubmit`, which is the next
slice, not a rename. `Form` owns the `<form>`,
the `FormProvider`, the submit binding and the action row (`submitLabel`, optional `onCancel`, or
a caller `footer`); its `resolver` is where an Effect schema becomes per-field messages, and the
render callback receives the form instance but does not need it. `DebounceForm` is the sibling for
a screen that saves as it types: same provider, no submit button, `onDebounce(values, form)` fired
once per quiet window through radash's `debounce` (`options: { delay }`), with the first render —
the default values — excluded.

Each of the twenty `*Field` bindings (`TextField`, `SelectField`, `DatePickerField`, …) takes a
`name`, a `label` and its widget's own props, then reaches the form through `useFormProvider()`.
It never accepts a value, an onChange, a `control` or a form; outside a `Form` it throws, so a
misplacement is a stack trace instead of a silently orphaned input. That is the whole reason the
layer exists: a screen declares a shape once and writes nineteen one-line fields.

An amount is a string of minor units, so no amount ever reaches `NumberInput` or `Slider`: the
type scale difference is the feature. `DownloadTrigger` covers the one export a screen hands
straight to the browser (`data` + `fileName`), so no screen builds an object URL. `NavigationMenu`
is wrapped but not used yet: today the shell is one row of links above `sm` and a `Drawer` under
it, and a nested rail would move to that component rather than grow a second menu.

## API layer

The generated contract is all-optional, so `src/api/types.ts` owns `Fixed<T>` (deep-required) and
the row aliases a screen actually names; the fields Go's `omitempty` really drops are re-opened
explicitly, and `Paged<>` keeps `next_cursor` optional because the list envelope omits it at the
end. `src/api/<resource>.ts` is the only place `api.GET/POST/PATCH` is written: one function per
endpoint, envelope unwrapped, failures thrown as `ApiError` (`status`, `code`, `traceId`).
`src/hooks/queries/<resource>.ts` adds the TanStack layer — stable keyed queries, mutations that
invalidate what they changed — so a screen holds no fetcher and no error formatting.

Effect stays where it was: a Schema parses what a person typed, at the form resolver. The request
path is a promise + TanStack on purpose; an Effect runtime there would add a bridge without
adding a capability.

## How it ships

`make web` writes `web/dist`; `go build -tags web` embeds it (`web/assets_web.go`) and the `http`
process serves it: the file when the path names one, `index.html` otherwise, `/api/*` and
`/healthz` untouched, `/assets/*` immutable for a year and the shell `no-cache`. Without the tag
(`web/assets_off.go`) nothing is embedded and `GET /` stays a JSON `404`.

There is no environment variable for this, by design. The Dockerfile carries four targets —
`latest` (embedded), `server` (headless), `web` (the SPA on nginx, for split deploys) and `cli` —
and its `APP_WEB` build arg exists only to refuse `off` on the full image. CI compiles
`-tags web` on every push so a broken embed is not a release-day surprise.

## Theme

`web/src/styles.css` is the whole design system: ink black, porcelain cream, lacquer cherry,
brass glow as brand ramps; jade, amber, oxblood, verdigris, lapis for success, warning,
danger, tertiary and info; and semantic aliases (`surface`, `border`, `text`, `primary`,
`accent`) that screens use instead of reaching into a ramp.

## Open

- `APP_WEB=off` and the embed step are not wired yet: `spenicle http` does not serve `/` today.
- Capture approval, import review, exports, insights and settings are screens, not endpoints.
- Offline queue and background sync.
