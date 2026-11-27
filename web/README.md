# web/ — the SPA

The browser client for Spenicle: React 19, TypeScript, Vite, TanStack Router and TanStack
Query, forms on react-hook-form with Effect Schema rules, headless Ark UI, styled with
Tailwind v4 and typed from the API's own `openapi.json`.

```bash
make web-dev     # :5173, proxying /api to a local `make run` on :8080
make web         # install (frozen lockfile) and build into web/dist
make web-check   # typecheck + lint + format check + tests — the gate
make web-types   # regenerate src/api/schema.d.ts from ../openapi.json
```

Six runtime dependencies beyond React, each earning its place: **Ark UI** (behaviour — focus
trap, listbox, calendar, dismissable layers), **TanStack Router/Query** (typed routes, cache),
**react-hook-form** + **Effect Schema** (field state, one parse that is both validation and
type), **radash** (the debounce in `DebounceForm`, plus the odd `group`/`pick`), **lucide-react**
(the only icon source), **openapi-fetch** + **tailwind-merge**/`clsx`. Nothing else gets added
without a reason stronger than convenience.

## Toolchain

| tool                                    | why this one                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pnpm**, pinned by `packageManager`    | one store, a lockfile the CI can freeze, and `onlyBuiltDependencies` so a postinstall cannot run unasked                                                                                                                        |
| **oxlint** (`--deny-warnings`)          | Rust-fast, so it can run on every save; the config enables correctness/suspicious/perf as **errors** and then a curated rule list instead of "everything pedantic" — 562 rules on day one is noise, 60 blocking rules is a gate |
| **oxfmt**                               | same engine family as oxlint, one config (`.oxfmtrc.json`), `fmt:check` in the gate                                                                                                                                             |
| **tsgo** (`@typescript/native-preview`) | TypeScript's native compiler: the same `tsc` semantics, ~10x faster on this tree. It already rejected a `baseUrl` that `tsc` still tolerates, so the config is future-proof                                                     |
| **mise**                                | `node` + `pnpm` are pinned in `mise.toml` next to `go`, so a clone is one `mise install`                                                                                                                                        |

## `components/` — four layers, one direction

Composition runs one way and the linter holds the line: **primitives → ui → widgets → layouts →
a page**. A layer may import the layers below it and never the ones above, so a primitive can
never grow a page's idea of what an amount means.

| layer         | what it is                                                                                                                    | example                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `primitives/` | the lowest UI layer: Ark headless wiring + our palette. One props type of our own, one export per file, wiring and theme only | `Button`, `TextInput`, `Dialog`, `Text`              |
| `ui/`         | domain-agnostic presentation, composed from primitives                                                                        | `Form`, `DebounceForm`, the twenty `*Field` bindings |
| `widgets/`    | page-level composition: a section a page drops in, given its data                                                             | `CaptureList`                                        |
| `layouts/`    | structure only: chrome, navigation, the outlet                                                                                | `AppShell`                                           |

`oxlint`'s `no-restricted-imports` carries one override per layer, so an upward import (`ui/` into
`primitives/`, `layouts/` into `widgets/`) is a lint error with a message saying why, and `@ark-ui/*`
stays unreachable outside `primitives/`. The boundary is enforced, not documented. 66 primitives,
by the job a screen hires them for:

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

`render.test.tsx` mounts every component once, so a wrapper that reaches for a browser API jsdom
does not have fails here instead of in a screen.

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
  widgets/
    index.ts
    capture-list/index.tsx
  layouts/
    index.ts
    app-shell/index.tsx
```

The folder is the identity: a file that needs a helper or a test sits next to its component
instead of in a shared bag, and `@/components/primitives/button` resolves to the folder's
`index.tsx`, so no call site has to know the layout.

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

## `lib/format/` — the fallbacks live with the data

A component should not decide what a missing field looks like. `lib/format/<entity>.ts` holds one
pure module per entity (`capture`, `entry`, `account`), and it answers both questions a screen
asks:

- **what to show** — `captureTime(row)`, `entryTitle(row)`, `accountBalance(row)`, each already
  carrying the fallback (`absent`, exported once) so JSX never writes `?? '—'`;
- **what is true** — `isReversed(entry)`, `needsAttention(capture)`, `isArchived(account)`,
  `hasNote(entry)`, so a branch reads as a fact instead of a field comparison.

No React, no hooks, no `text-*` class except the data-driven tone a status earns. The input types
are all-optional field shapes, so a partial row formats instead of throwing, and a `Fixed<>` row
satisfies them. Table-driven tests live next to it (`format.test.ts`).

## The theme

One file owns the look: `src/styles.css`. Four brand ramps — **ink black** (the paper),
**porcelain cream** (the ink), **lacquer cherry** (primary), **brass glow** (accent) — plus
**jade** success, **amber** warning, **oxblood** danger, **verdigris** tertiary and **lapis**
info, each as a real scale so a hover or a border has a shade to reach for.

Screens use the semantic tokens only (`bg-surface`, `text-text-muted`, `border-border`,
`bg-primary`, `text-accent`, `text-success`…), so a re-theme is that file and nothing else.
Headings are the one serif in the product; everything numeric is tabular.

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

**One schema for a form and its types.** `src/lib/capture.ts` declares the capture fields as
an Effect `Schema.Struct`; react-hook-form parses the submitted values through it
(`Schema.decodeUnknownSync`), so the field rules and the value type cannot drift. Ark UI's
headless `Select` (`src/components/account-select.tsx`) supplies keyboard, typeahead and
aria while Tailwind owns the look.

**Money never becomes a float.** Every amount on the wire is a string of minor units.
`src/lib/money.ts` parses and renders it with string arithmetic — no `Number()`, no
`toFixed()` — because a ledger that rounds is a ledger that lies. `minor_units` comes from
`GET /api/meta`, so JPY (0), IDR (2) and BHD (3) all render correctly.

## Layout

```
src/api/client.ts     openapi-fetch over the same origin, Bearer from the token store
src/api/types.ts      Fixed<> and the row aliases — the only shapes a screen names
src/api/<resource>.ts one module per resource: the endpoint, the envelope, the ApiError
src/api/error.ts      ApiError: status, code, traceId, one message
src/api/query.ts      the one QueryClient
src/hooks/queries/    TanStack queries and mutations over those callers
src/types/generated/  generated contract — never edit; run `make web-types`
src/components/       primitives → ui → widgets → layouts (see above)
src/router.tsx        code-based routes + the auth guard in beforeLoad
src/routes/           AppShell's outlet: login, ledger, captures
src/lib/money.ts      minor-unit string arithmetic
src/lib/format/       per-entity display: fallbacks and flags, so JSX has no `??`
```

## What is deliberately not here yet

Capture approval, statement import review, exports, analytics, settings and offline capture
queueing. Each is a screen over an endpoint that already exists; the router and the typed
client do not change to add them.
