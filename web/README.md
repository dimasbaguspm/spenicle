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

## Toolchain

| tool                                    | why this one                                                                                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pnpm**, pinned by `packageManager`    | one store, a lockfile the CI can freeze, and `onlyBuiltDependencies` so a postinstall cannot run unasked                                                                                                                        |
| **oxlint** (`--deny-warnings`)          | Rust-fast, so it can run on every save; the config enables correctness/suspicious/perf as **errors** and then a curated rule list instead of "everything pedantic" — 562 rules on day one is noise, 60 blocking rules is a gate |
| **oxfmt**                               | same engine family as oxlint, one config (`.oxfmtrc.json`), `fmt:check` in the gate                                                                                                                                             |
| **tsgo** (`@typescript/native-preview`) | TypeScript's native compiler: the same `tsc` semantics, ~10x faster on this tree. It already rejected a `baseUrl` that `tsc` still tolerates, so the config is future-proof                                                     |
| **mise**                                | `node` + `pnpm` are pinned in `mise.toml` next to `go`, so a clone is one `mise install`                                                                                                                                        |

## `components/ui` — our vocabulary, not Ark's

Every primitive the screens use lives here, with a props type of our own and exactly one
export per file. A widget never imports a headless library — `oxlint`'s `no-restricted-imports`
blocks `@ark-ui/*` outside this directory, so the boundary is enforced, not documented. A file
carries wiring and theme only: a screen decides what a value means, the component decides how a
value is chosen and shown.

56 components, by the job a screen hires them for:

| group                | components                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| text and scaffolding | `Text` (h1–h6, p, span, label, pre, code, …), `Field`, `Fieldset`, `Button`                                                                                                                                                          |
| text entry           | `TextInput`, `EmailInput`, `PasswordInput`, `TextAreaInput`, `NumberInput`, `DateInput`, `DateTimeInput`, `DatePicker`, `Editable`                                                                                                   |
| choice               | `Checkbox`, `RadioGroup`, `SwitchInput`, `Toggle`, `ToggleGroup`, `SegmentGroup`, `SelectInput`, `Combobox`, `Listbox`, `PinInput`, `TagsInput`, `Slider`, `AngleSlider`, `RatingGroup`, `ColorPicker`, `FileUpload`, `SignaturePad` |
| overlay              | `Dialog`, `Drawer`, `Popover`, `HoverCard`, `Tooltip`, `Menu`, `Toaster`                                                                                                                                                             |
| status               | `Progress` (linear and circle), `Timer`, `QrCode`, `Clipboard`, `Highlight`, `Marquee`                                                                                                                                               |
| structure            | `Accordion`, `Collapsible`, `Tabs`, `Steps`, `ScrollArea`, `Splitter`, `Carousel`, `Avatar`, `Pagination`, `TreeView`, `JsonTreeView`, `Toc`, `FloatingPanel`, `ImageCropper`                                                        |

Ark owns the behaviour — field association, listbox and typeahead, focus trap, roving focus,
page-range math, dropzone, calendar — and we own the props, the markup and every token.
`Text` is the one exception to the Ark rule, and it is deliberate: a tag carries the semantics
(`as="h1"`), a `tone` carries the look, and Ark's `Label`/`ErrorText` clone it with `asChild` so
the type scale lives in one file instead of in twenty `className` strings.

Two files break "one component per export" on purpose: `control.ts` is the shared cva every
input wears, and `toaster.ts` is the imperative `toast` store `Toaster` reads.

cva variants are merged by `tailwind-merge` through `lib/cn.ts`, so a caller's `className` wins
on conflict. `TextInput` and not `NumberInput` represents an amount: an amount is a string of
minor units, and a numeric widget would tempt a float.

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
src/api/client.ts   openapi-fetch over the same origin, Bearer from the token store
src/api/schema.d.ts generated — never edit; run `make web-types`
src/api/query.ts    the one QueryClient
src/router.tsx      code-based routes + the auth guard in beforeLoad
src/routes/         shell, login, ledger, captures
src/lib/money.ts    minor-unit string arithmetic
```

## What is deliberately not here yet

Capture approval, statement import review, exports, analytics, settings and offline capture
queueing. Each is a screen over an endpoint that already exists; the router and the typed
client do not change to add them.
