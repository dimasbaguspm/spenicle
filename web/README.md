# web/ — the SPA

The browser client for Spenicle: React 19, TypeScript, Vite, TanStack Router and TanStack
Query, forms on react-hook-form with Effect Schema rules, headless Ark UI, styled with
Tailwind v4 and typed from the API's own `openapi.json`.

```bash
make dev-web     # :5173, proxying /api to a local `make dev` on :8080
make web         # install (frozen lockfile) and build into web/dist
make web-check   # typecheck + lint + format check + the test harness — the gate
make web-types   # regenerate src/api/schema.d.ts from ../openapi.json
```

Seven runtime dependencies beyond React, each earning its place: **Ark UI** (behaviour — focus
trap, listbox, calendar, dismissable layers), **TanStack Router/Query** (typed routes, cache),
**react-hook-form** + **Effect Schema** (field state, one parse that is both validation and
type), **radash** (the debounce in `DebounceForm`, plus the odd `group`/`pick`), **lucide-react**
(the only icon source), **openapi-fetch** + **tailwind-merge**/`clsx`, and **dayjs** (the one
date parser behind `lib/date.ts`). Nothing else gets added without a reason stronger than
convenience.

## Toolchain

| tool                                    | why this one                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pnpm**, pinned by `packageManager`    | one store, a lockfile the CI can freeze, and `onlyBuiltDependencies` so a postinstall cannot run unasked                                                                                                                        |
| **oxlint** (`--deny-warnings`)          | Rust-fast, so it can run on every save; the config enables correctness/suspicious/perf as **errors** and then a curated rule list instead of "everything pedantic" — 562 rules on day one is noise, 60 blocking rules is a gate |
| **oxfmt**                               | same engine family as oxlint, one config (`.oxfmtrc.json`), `fmt:check` in the gate                                                                                                                                             |
| **tsgo** (`@typescript/native-preview`) | TypeScript's native compiler: the same `tsc` semantics, ~10x faster on this tree. It already rejected a `baseUrl` that `tsc` still tolerates, so the config is future-proof                                                     |
| **mise**                                | `node` + `pnpm` are pinned in `mise.toml` next to `go`, so a clone is one `mise install`                                                                                                                                        |

## Layers — four under `components/`, one above it

Composition runs one way and the linter holds the line: **primitives → ui → layouts**, and above
them **modules/**, one folder per entity, which a page composes. A layer may import the layers
below it and never the ones above, so a primitive can never grow a page's idea of what an amount
means and a module never learns to fetch.

| layer         | what it is                                                                                                                            | example                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `primitives/` | the lowest UI layer: Ark headless wiring + our palette. One props type of our own, one export per file, wiring and theme only         | `Button`, `TextInput`, `Dialog`, `Text`                                  |
| `ui/`         | domain-agnostic presentation, composed from primitives                                                                                | `Form`, `DebounceForm`, the twenty `*Field` bindings                     |
| `modules/`    | (a sibling of `components/`) one folder per entity: the component a page drops in, plus the fallbacks, flags and tone it answers with | `entry`, `account`, `capture`, `month`, `analytics`, `token`, `settings` |
| `layouts/`    | structure only: chrome, navigation, the outlet                                                                                        | `AppShell`                                                               |

The shell is one of two shapes, not one that shrinks: from `lg` up a header carries the three
working sections (Register, Accounts, Analytics) on the left and New entry plus Settings on the
right; below `lg` there is no header at all, and a five-slot bottom bar carries Overview, Accounts,
the register in the middle, Analytics, and a More menu (Captures, Settings, theme, sign out). Each
screen opens with a breadcrumb instead of an eyebrow, so "Ledger / Register" says where you are
without repeating the title underneath it.

`oxlint`'s `no-restricted-imports` carries one override per layer, so an upward import (`ui/` into
`primitives/`, `modules/` into `ui/`) is a lint error with a message saying why, `@ark-ui/*` stays
unreachable outside `primitives/`, and a module cannot reach for a route or a hook. The boundary is
enforced, not documented.

66 primitives, by the job a screen hires them for:

| group                | components                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| text and scaffolding | `Text` (h1–h6, p, span, label, pre, code, …), `Field`, `Fieldset`, `Button`                                                                                                                                                          |
| text entry           | `TextInput`, `EmailInput`, `PasswordInput`, `TextAreaInput`, `NumberInput`, `DateInput`, `DateTimeInput`, `DatePicker`, `Editable`                                                                                                   |
| choice               | `Checkbox`, `RadioGroup`, `SwitchInput`, `Toggle`, `ToggleGroup`, `SegmentGroup`, `SelectInput`, `Combobox`, `Listbox`, `PinInput`, `TagsInput`, `Slider`, `AngleSlider`, `RatingGroup`, `ColorPicker`, `FileUpload`, `SignaturePad` |
| overlay              | `Dialog`, `Drawer`, `Popover`, `HoverCard`, `Tooltip`, `Menu`, `NavigationMenu`, `Toaster`                                                                                                                                           |
| structure            | `Accordion`, `Collapsible`, `Tabs`, `Steps`, `ScrollArea`, `Splitter`, `Carousel`, `Avatar`, `Pagination`, `TreeView`, `JsonTreeView`, `Toc`, `FloatingPanel`, `ImageCropper`                                                        |
| status               | `Progress` (linear and circle), `Timer`, `QrCode`, `Clipboard`, `Highlight`, `Marquee`, `Swap`, `DownloadTrigger`                                                                                                                    |

Ark owns the behaviour — field association, listbox and typeahead, focus trap, roving focus,
page-range math, dropzone, calendar — and we own the props, the markup and every token.
`Text` is the one exception to the Ark rule, and it is deliberate: a tag carries the semantics
(`as="h1"`), a `tone` carries the look, and Ark's `Label`/`ErrorText` clone it with `asChild` so
the type scale lives in one file instead of in twenty `className` strings.

Two files break "one component per export" on purpose: `control.ts` is the shared cva every
input wears, and `toaster.ts` is the imperative `toast` store `Toaster` reads.

There is no test file in this tree: the vitest harness (jsdom, the same config, `passWithNoTests`)
stays wired so the first test runs as written, and the gate still calls it.

cva variants are merged by `tailwind-merge` through `lib/cn.ts`, so a caller's `className` wins
on conflict. `TextInput` and not `NumberInput` represents an amount: an amount is a string of
minor units, and a numeric widget would tempt a float.

### One folder per component

```
src/components/
  primitives/
    index.ts            re-exports every primitive, so a screen can `import { Button, Text } from '@/components/primitives'`
    button/index.tsx    one component, one private props type, one export
    text/index.tsx
    control/index.ts    the shared cva every input wears
  ui/
    index.ts
    form/index.ts       Form, DebounceForm, useFormProvider and the twenty `*Field` bindings
    form/form.tsx
    form/text-field.tsx
  ../modules/
    entry/index.ts      one folder per entity, outside `components/`: the barrel a page imports
    entry/row.ts        the pure function behind the row — the fallbacks, the flags, the tone
    entry/entry-register.tsx
    entry/entry-ticker.tsx
    entry/entry-amount.tsx   one component per file, named for what it renders
    entry/schema.ts     the form's Effect schema and its empty value
  layouts/
    index.ts
    app-shell/index.tsx
```

The folder is the identity: a file that needs a helper or a test sits next to its component
instead of in a shared bag, and `@/components/primitives/button` resolves to the folder's
`index.tsx`, so no call site has to know the layout. `modules/` keeps that shape one level up, with
`index.ts` as the barrel and one component per file.

### Icons

Every icon comes from `lucide-react` — `size-4` (`size-3` in a dense row), `strokeWidth={1.75}`,
`aria-hidden="true"`, colour inherited from the parent's `text-*` token. No unicode glyphs, no
CSS-drawn chevrons: a character is a font that might be missing and a shape that cannot be
restyled. Where the glyph meant something, the meaning moved to the trigger's `aria-label`.

### Forms

`form/` is where the app's form layer lives: it is the only place `react-hook-form` is meant to be
imported, and the ledger screen (still written directly against `useForm`) is the last caller to
migrate. A screen writes the shape once and never wires a `Controller`:

```tsx
<Form<CaptureValues> defaultValues={empty} resolver={resolver} onSubmit={save}>
  {() => (
    <>
      <DateField<CaptureValues> name="occurred_on" label="Date" />
      <SelectField<CaptureValues> name="account_ref" label="Account" options={accounts} />
      <TextField<CaptureValues> name="amount" label="Amount" hint="Minor units" />
    </>
  )}
</Form>
```

- `Form` owns the `<form>`, the `FormProvider`, the submit binding and the action row
  (`submitLabel`, optional `onCancel`, or your own `footer`). `resolver` is where an Effect
  schema turns into per-field errors; the callback is handed the form instance but does not
  need it.
- `DebounceForm` is the sibling for a screen that saves as it types: same provider, no submit
  button, `onDebounce(values, form)` called once per quiet window (`options: { delay }`, radash
  underneath), and the first render — the default values — never counts as an edit.
- A `*Field` takes a `name`, a `label` and its widget's props, then calls `useFormProvider()`.
  It never accepts a value, an onChange, a `control` or a form. Outside a `Form` it throws, so a
  misplacement is a stack trace rather than a silently orphaned input.

## Filters live in the URL

One abstraction, four parts, and every list shares it:

- `lib/filter.ts` is the contract: `FilterSpec<State, Query>` says how to `parse` a URL, how to
  `toQuery` a spec for the API, and how to count the `active` fields.
- `modules/entry/filters.ts` is the one implementation for entries (`entryFilterSpec`), so
  `/ledger` and `/accounts/$ref` cannot drift.
- `hooks/use-filter-query.ts` joins it to the route: give it `search`, an `onChange` that writes
  the URL, the spec, a `limit` and the fields the route **pins** (an account page pins its
  account), and it returns `{ value, query, active, apply, clear }`.
- The screen never spells a query param: it hands `query` to the hook that fetches, and `apply`
  to the controls.

The rail applies as you change it; the phone's sheet edits a draft and stamps it with Apply, so a
half-typed date costs no request. Because the state is the URL, a narrowed view is a link:

| URL                                     | means                                                   |
| --------------------------------------- | ------------------------------------------------------- |
| `/ledger?from=2026-11-01&to=2026-11-30` | one month of entries                                    |
| `/ledger?account=<ref>&q=coffee`        | one account, notes or payee matching coffee             |
| `/accounts/<ref>?from=…`                | one account's movements, with a running balance per row |

The route validates the search (`validateSearch: entrySearch`), so an unknown or empty param is
dropped rather than sent, and `/accounts/$ref` pins `account_ref` to the account in the path.

## Accounts and categories — one table, two screens

A category is an account of kind `expense` or `income`; there is no separate table and no
separate endpoint. The screens are still split, because they answer different questions:
`/accounts` is the balance sheet (asset, liability, equity) and `/categories` names what the
money was for. `modules/account/kinds.ts` holds the split (`moneyGroups`, `categoryGroups`,
`accountScope`), `AccountBalances` takes the scope and draws whichever groups it names, and each
screen keeps its own create, detail and edit route so a category URL never reads `/accounts/`.
`/accounts/$ref` carries the register's filters; `/categories/$ref` is lighter, since a category
has one useful question: what got filed here.

Payees are the third list: `/payees`, `/payees/new`, `/payees/$ref`, `/payees/$ref/edit`. A payee
is a name plus two optional defaults (`default_account_ref`, `default_category_ref`); the form
sends a ref only when one was picked, which is also how a patch leaves the other default alone.
`modules/payee/row.ts` resolves both refs to words once per page instead of once per row.

## `api/` and `hooks/queries/` — one shape, one door

The generated contract (`src/types/generated/openapi.ts`) marks every field optional, which is
honest about the wire and useless in a component. `src/api/types.ts` fixes that once: `Fixed<T>`
deep-strips optionality, and the aliases (`Account`, `Entry`, `Capture`, `Meta`, …) re-open the
handful of fields Go's `omitempty` really can drop (`Entry.note`, `Capture.raw_text`,
`Token.revoked_at`). Presentation imports the alias, never the schema.

One module per resource (`api/entries.ts`, `api/accounts.ts`, …) owns its endpoints: it calls
`api.GET/POST/PATCH` exactly once, unwraps the envelope, and either returns the fixed type or
throws `ApiError` (`status`, `code`, `traceId`, message read from the shared `{ error: {…} }`
body). A screen never writes `await api.GET(…)`, never inspects `response.status`, and never
formats an error envelope itself.

`hooks/queries/*` wraps a caller in TanStack Query: one stable key per resource
(`['entries', filters]`), and a mutation invalidates what it changed. Hooks hold the React
lifecycle; callers stay plain async functions, which is what keeps them callable from a test and
from a route loader.

**Effect or TanStack?** Both, at different jobs, and the boundary is a _value_, not a request.
Effect Schema validates and parses what a person typed (the form resolver); TanStack owns
fetching, caching, retry and invalidation. An Effect `Runtime` on the request path would buy
nothing here — no resource scopes, no per-query concurrency — and bridging it to `useQuery`'s
promise contract would only re-implement `useQuery`.

## `modules/` — the fallbacks live with the entity

A page should not decide what a missing field looks like. `src/modules/<entity>/` is one folder per
entity, and it answers every question a page asks of a row:

- **what to show** — `entryRow(entry, accounts, scale)` returns the day, the joined title, the
  category and the signed figure, each already carrying its fallback (`absent`, declared once in
  `lib/text.ts`) so JSX never writes `?? '—'`;
- **what is true** — `isReversed`, `outgoing`, `needsAttention`, `isRevoked`, so a branch reads as a
  fact instead of a field comparison;
- **what it looks like** — `EntryRegister`, `EntryTicker`, `AccountBalances`, `CaptureList`,
  `MonthSeries`, `CategoryBreakdown`, `TokenList`, `SettingsFacts`: each a component a route drops
  in with its rows and a `MoneyScale`.

Every module is `<entity>/<component-name>.tsx` next to the pure function it renders —
`account-balances.tsx` beside `kinds.ts`, `entry-register.tsx` beside `row.ts`, `month-bars.tsx`
beside `series.ts` — and `index.ts` re-exports them, so `@/modules` is the one import a page needs.
A module owns its component and the function behind it, imports `components/` and `lib/`, and may
not import a route or a hook: the linter says so, not this file. So `routes/*` composes modules — no
`?? '—'`, no `Number()` on an amount, no `text-*` tone picked from a status string. A window is a
module's own fact too: `monthsBack(12)` belongs to `month/`, not to a date helper.

## `lib/` — three primitives, one promise each

- **`money.ts`** — minor units are integers. `formatMoney(minor, units)` opens a chain:
  `.toMinor()`, `.toDecimal()`, `.toDisplay('USD')`, `.sign()`, `.absolute()`, `.negate()`,
  `.add()`. A caller names the scale it wants instead of re-deriving one. `parseMoney(text, units)`
  is the same chain for what a person typed, and `sumMinor` gives an exact total without ever
  making a float.
- **`date.ts`** — one job: `formatDate(value, DateFormat.Day)` renders a wire day, a form field, a
  `Date` or a dayjs through one set of named templates (`Iso`, `Day`, `Month`, `MonthLong`,
  `Timestamp`, `Time`). dayjs underneath; nothing else parses a date, and nothing here decides which
  window to ask the API for.
- **`text.ts`** (`absent`) and **`cn.ts`** (the cva merge).

## `providers/` — what the app needs before a screen renders

Two contexts, in the order `main.tsx` nests them: `AppProvider` outside, `AuthProvider` inside.

- **`AppProvider`** is the gate. It reads `GET /api/bootstrap` once and renders nothing below it
  until that answers: a splash while it loads, the message plus a retry button when the instance
  does not answer, and then `useApp()` hands every screen `{ bootstrap }` — `setup_completed`,
  `claimable`, the base currency, the capability flags. It deliberately never reads `/api/meta`: that one sits
  behind a token, a fresh instance has none, and meta belongs to the screen that holds one.
- **`AuthProvider`** is the token. `useAuth()` answers `token`, `isAuthenticated`, `signIn(spl_…)`
  and `signOut()`. `api/token.ts` stays the store (`sessionStorage`) and this is the React view of
  it, so a screen never reaches for storage and the instance password never reaches either.

## The theme

One file owns the look: `src/styles.css`, and it holds three layers in that order.

1. **Brand ramps** (`@theme`): ink, porcelain, cherry, brass, jade, amber, lapis and oxblood, each
   a real scale so a hover or a border has a shade to reach for.
2. **Semantic tokens** (`@theme inline`): `surface`, `surface-raised`, `surface-sunken`, `border`,
   `border-strong`, `text`, `text-muted`, `text-faint`, `primary`, `on-primary`, `accent`,
   `accent-soft`, `on-accent`, `success`, `warning`, `info`, `danger`. Every utility in `src/`
   names one of these; a ramp class in a component is a bug, because it cannot follow the theme.
3. **Two theme blocks**: `:root[data-theme='dark']` and `:root[data-theme='light']`, each a flat
   list of `--app-*` values. That is the whole light/dark difference.

`ThemeProvider` (`src/providers/theme-provider.tsx`) owns the choice: no stored choice means the
client's `prefers-color-scheme` and follows it live, an explicit Light or Dark pins
`localStorage['spenicle.theme']`, and `index.html` paints the same rule in a four-line script
before the first frame so nothing flashes. `ThemeToggle` in the shell header (signed in) and the
footer (anonymous) sets it.

### Two faces, two jobs

The fonts are self-hosted (`@fontsource-variable/*`, bundled by Vite) and mapped to the
`--font-*` tokens, so nothing waits on a third-party CDN and the app renders offline:

| token         | face                        | where it is allowed                                                |
| ------------- | --------------------------- | ------------------------------------------------------------------ |
| `--font-sans` | **Inter Variable**          | everything: wordmark, titles, prose, labels                        |
| `--font-mono` | **JetBrains Mono Variable** | every figure: amounts, days in the register, refs, the `.env` hint |

`--font-display` is an alias of the sans face, so a heading is the same Inter with tighter
tracking rather than a second typeface. Figures are tabular everywhere
(`font-variant-numeric: tabular-nums` on `body`), because a register is a column that has to line
up. Eyebrows are wide-tracked and uppercase; headings get `text-wrap: balance`, body copy
`text-wrap: pretty`, so a paragraph never ends on a stranded word. Copy avoids em dashes and
middle dots: a separator is a comma, a full stop or a column, never a glyph standing in for
structure.

### The rules a screen follows

- **One plate per region.** `Panel` owns the border, the lit top edge and the brass hairline.
  A screen never writes its own card.
- **One control surface.** `control()` owns every input's height, border, inset shadow and
  focus ring; a new widget reuses it instead of looking like itself.
- **A state is never colour alone.** The selected select row carries brass text _and_ a check;
  a disabled button loses its lacquer instead of fading; errors carry the code as text.
- **Radii are small on purpose** (6px controls, 8px plates): lacquer and brass read as
  expensive, a pill-shaped SaaS card does not.
- **Mobile first for hit targets.** Controls are 44px tall and 16px text under `sm` (the moment
  an iOS field focuses at 12px the page zooms); the register row reflows to two lines instead
  of truncating a name to five characters.
- **Motion is one pixel.** A press moves a button down by 1px; `prefers-reduced-motion` kills
  every transition.

## The three decisions this scaffold encodes

**Client-side rendering, one origin.** There is no SSR: the API serves JSON and the browser
renders. In production `spenicle http` serves this `dist/` and `/api` on the same port, so
`fetch('/api/…')` is same-origin and there is no CORS middleware anywhere in the repo. In
development Vite's `server.proxy` plays the same role. `src/api/client.ts` therefore has an
empty `baseUrl`: a base URL is a configuration knob this app does not have.

**The password is exchanged, never stored.** `src/routes/login.tsx` sends the instance
password once as a Bearer credential to `POST /api/tokens`, receives a scoped `spl_…` token,
and keeps only that in `sessionStorage` (`src/api/token.ts`). A leaked browser credential is
revocable from the settings screen; the root password is not in the browser at all.

**A fresh instance is claimed in one screen.** `src/routes/setup.tsx` is public, and
`src/api/bootstrap.ts` is the one read it needs: `GET /api/bootstrap` answers
`setup_completed` and `claimable` without a credential, and a fresh database has no password
at all. The
form sends one `POST /api/setup` carrying the password, the base currency and an optional
opening account, then exchanges that password for a scoped token. The password is never
written to `sessionStorage`; only the token is.

**One schema for a form and its types.** `src/modules/entry/schema.ts` declares the entry fields as
an Effect `Schema.Struct`; react-hook-form parses the submitted values through it
(`Schema.decodeUnknownSync`), so the field rules and the value type cannot drift. The headless
`SelectInput` primitive supplies keyboard, typeahead and aria while Tailwind owns the look.

**Money never becomes a float.** Every amount on the wire is a string of minor units.
`src/lib/money.ts` parses and renders it with integer arithmetic — `BigInt` for a total, string
splitting for a scale, never `Number()` on an amount and never `toFixed()` — because a ledger that
rounds is a ledger that lies. `minor_units` comes from `GET /api/meta`, so JPY (0), IDR (2) and BHD
(3) all render correctly, and `MoneyScale` is how a page hands both facts down.

## Layout

```
src/api/client.ts     openapi-fetch over the same origin, Bearer from the token store
src/api/types.ts      Fixed<> and the row aliases — the only shapes a screen names
src/api/<resource>.ts one module per resource: the endpoint, the envelope, the ApiError
src/api/error.ts      ApiError: status, code, traceId, one message
src/api/query.ts      the one QueryClient
src/hooks/queries/    TanStack queries and mutations over those callers
src/types/generated/  generated contract — never edit; run `make web-types`
src/components/       primitives → ui → layouts (see above); the shell turns into a
                      Drawer with the same sections under `sm`
src/modules/          one folder per entity: <entity>/<component>.tsx plus the function behind
                      it, re-exported by <entity>/index.ts, the only place a fallback lives
src/providers/        AppProvider (the bootstrap gate), AuthProvider (the token) and
                      ThemeProvider (light/dark), see above
src/styles.css        the tokens: palette, three faces, one base layer
src/router.tsx        code-based routes + the auth guard in beforeLoad
src/routes/           AppShell's outlet: login, setup, dashboard, ledger, ledger/new,
                      ledger/$ref, accounts (+new, $ref, $ref/edit), categories (same four),
                      payees (same four), analytics, captures, settings.
                      Composition only; a form lives here, a row lives in modules/.
src/lib/money.ts      formatMoney/parseMoney, the dotted scale chain
src/lib/date.ts       formatDate + the DateFormat templates, dayjs underneath
```

## What is deliberately not here yet

Capture approval, statement import review, exports and offline capture queueing. Each is a
screen over an endpoint that already exists; the router and the typed client do not change
to add them. Overview, register, accounts, categories, payees, analytics and settings are live.
