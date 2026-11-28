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

## The two gates — sign in and claim

`/` and `/setup` are the only screens a visitor without a credential can open, and both are one
component: `components/layouts/gate`. The statement sits on the left (what this screen is, and the
three decisions a claim makes), the plate that answers it on the right; below `lg` the statement
shrinks to a heading and the plate is the page. The public shell is as wide as the plate needs, so
the two columns have room; the wordmark lives in its footer and is not repeated inside the gate.

## The dashboard — one call, four readings

`/dashboard` reads `GET /api/dashboard` once. The plate at the top is this month: net as the big
figure, spent and received beside it, and six months of spend as bars to the right of the divider.
Under it, two cards that are links rather than statistics — captures waiting for review, and the
biggest category of the window (which opens that category). The register's own ticker closes the
page with the last six entries.

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

The rail applies as you change it — through a 300 ms debounce, so typing a date costs one request
and not eight; the phone's sheet edits a draft and stamps it with Apply, so a half-typed date costs
none. Because the state is the URL, a narrowed view is a link:

| URL                                     | means                                                   |
| --------------------------------------- | ------------------------------------------------------- |
| `/ledger?from=2026-11-01&to=2026-11-30` | one month of entries                                    |
| `/ledger?account=<ref>&q=coffee`        | one account, notes or payee matching coffee             |
| `/ledger?account=a,b&category=c`        | anything touching a, b or c — the API widens a list     |
| `/accounts/<ref>?from=…`                | one account's movements, with a running balance per row |

The route validates the search (`validateSearch: entrySearch`), so an unknown or empty param is
dropped rather than sent, and `/manage/accounts/$ref` pins `account_ref` to the account in the path.

An account and a category are both accounts on the wire, so the rail keeps them apart and the
query joins them: `account_ref=a,b,c` means "touching any of these", never "all of them", because
that is the only semantics `GET /api/entries` has. Both fields are multi-selects
(`MultiSelectField`: the listbox adds, a chip takes away), and the chip strip says one name or a
count, so a filter never reads as a hash.

Every screen's top is one component, `components/primitives/page-header`: breadcrumb, title,
action. The title is desktop-only — a phone spends its first line on the breadcrumb instead of a
42px word above the list — and there is no subtitle, because a sentence belongs on the panel that
owns what it describes. Page actions are the transparent `quiet` button, never a filled one.

The same filter layer sits under `/manage/accounts/$ref`, `/manage/categories/$ref` and
`/manage/payees/$ref`, so the
question "what did I spend last month" is answerable on any of them: the route pins the ref it is
about (`account` or `payee`), the rest is the register's own rail, sheet and chips. One presentational
component draws them (`modules/entry/entry-movements.tsx`) and one hook feeds it
(`hooks/use-entry-movements.ts`) — a module may not reach for a hook, which is why the read lives
outside the module. `BreakpointTablet` and `BreakpointDesktop` are the two named halves of `lg`:
the rail and the sheet are never both rendered.

## Four pages per thing you keep

Every entity in `/manage` — account, category, payee, recurring rule, rule — has the same four
routes: `/manage/<thing>` lists and searches, `/new` creates, `/<ref>` shows one, `/<ref>/edit`
changes it. The list is a list: its action buttons live on the detail page, so a stray click cannot
pause a schedule or archive a rule. Captures, imports and exports follow the same shape with the
route the API actually has — a capture's `/new` signs posts to `/ledger/new?mode=scan` (the file
picker is already there) and its `/<ref>/edit` is the review, because approving is the only edit a
capture has; an export's `/<ref>` is the job plus its event log.

Saving a thing lands on its detail page, cancelling goes back to the list, and adding a second thing
is one click from the list's action. A list that cannot search on the server filters what it
fetched — the captures page matches the text the intake sent, the imports page the file name, the
exports page the format and status — and says so when nothing matches.

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

The three lists share the register's row: an uppercase column strip, the same grid, the same hover,
so a page of accounts, categories or payees reads like a page of entries. Each has a search box in
front of it (`?query=` on `/api/accounts` and `/api/payees`); the term is local state today, not a
URL parameter, so a filtered list cannot be linked yet. `/manage` is the index over Accounts,
Categories, Payees, Captures and Exports, and the desk header carries one tab for it.

Every row also has a history: `<EntityHistory kind ref />` (an `account`, a `payee`, a
`ledger_entry`) renders `GET /api/audit?entity_kind=…&entity_ref=…` as a timeline. An entry merges
that with one page of `ledger_entry` rows, because the journal keys a reversal to the mirror it
wrote and only names the parent inside `to.reversal_of_ref`; the matching line links through to the
other entry.

## Writing an entry — direction is the category

`/ledger/new` is one screen with two modes: type it, or scan it. The mode lives in the URL
(`?mode=scan`), a segmented strip on a phone and two cards on a desk, so the camera shortcut is
still one link.

The manual form reads from the top as one sentence: **Kind** (money out or money in), **Category**,
**What was it**, **Paid to** / **Received from**, **Paid from** / **Received in**, **Amount**, **Day**.
The first switch is what groups the categories: an expense entry only ever offers the expense half
of the ledger, an income entry the income half, and the two ref labels flip with it. The account
list spells the kind it is (`Cash (asset)`, `Visa (liability)`), because "paid from Savings" does
not say whether that account is money you had or money you owe.

Typing the note asks the rule engine the same question the rules screen does: `GET
/api/categorization/suggest` answers a category and the sentence that justifies it, the category is
filled in until a person picks one themselves, and the reason stays under the field. The suggestion
is advice — posting is still the button.

Nothing is deleted. `/ledger/$ref` offers Reverse, which asks for an optional reason and sends
`PATCH /api/entries/{ref}` with `reverse: true`: the postings are mirrored, both rows stay in the
journal, `reversed_at` marks the original, and the screen replaces the button with a `reversed`
chip once the API confirms. Under the entry is its **timeline**, read straight from `GET /api/audit`
with `entity_kind=entry`: created, edited, reversed, each line saying who and when. The API does
not publish `reversal_of_ref`, so the chain is shown as history rather than as a parent link.

`/captures/{ref}` is the review screen: the capture's own text, then one form that becomes the
entry (`PATCH /api/captures/{ref}` with `action: approve` and two postings) or a rejection with an
optional reason. Nothing posts itself. `/exports` queues a JSON or CSV export, lists the jobs with
their status, and downloads a ready file: the bytes arrive through `fetch` with the bearer header
and are saved from a blob, because the download route is not public.

Above the form sits the **source**: `GET /api/captures/{ref}/artifact` streams the uploaded bytes
with the content type and `Content-Disposition` recorded at upload, so the button fetches it with the
bearer header and saves the blob under the name the API sent. No artifact answers `404` and a
reclaimed one `410`, both shown as the API worded them — the file is the reviewer's only evidence,
so a missing one is said out loud rather than hidden.

## Recurring — a rule is a schedule, not an entry

`/manage/recurring` lists what comes back around, soonest first, and one form creates a rule: the
payee that names it, the category and account it lands in, the amount, the cadence and the next
due date. There is no direction switch here either — the category decides whether the rule files
money out or in, exactly as it does on the entry form.

A monthly rule carries its day of the month as the day of the due date, so the form asks for one
date and derives the rest. The row says `Every month on day 28`; pause and resume send
`PATCH /api/recurring/{ref}` with a `state` and nothing else, because payee, account and category
are immutable after creation. A rule never posts an entry: when it comes due the worker queues a
capture and `/manage/captures` is where it becomes one.

## Mailbox — the password is the key

`/settings/intake` is the only screen whose every route is root-only: `GET /api/connections`,
`POST /api/connections/google`, the revoke, `GET`/`PATCH /api/intake`, `POST /api/intake/run` and
`GET /api/intake/messages`. A scoped token answers `403`, so the page opens with one password field
and passes that credential per request (`api/connections.ts`, `api/intake.ts` take it as an
argument, the way `createToken` does). Nothing is stored: leave the field and the panels go with it.

The screen is three panels in the order the wiring has to happen. **Google mailbox**: the client id,
the secret and the redirect URL (`<origin>/api/connections/google/callback`) are posted once and the
answer is the authorise URL to follow; once a grant exists the panel says who it belongs to and
offers Revoke. **Polling**: `enabled` and the sender allowlist, saved in one `PATCH`; an empty
list means every sender. Poll now runs the same call the worker makes and prints
`created / skipped / unchanged / failed`. **Seen**: `GET /api/intake/messages`, one line per mail
reference with its status, the capture it became, and Re-read, which asks the provider for that mail
again.

## Rules — a suggestion with a reason

`/manage/rules` is the categorization table, and it is the one screen whose copy says outright what
the API means: a rule **suggests**, it never posts. The create form is four fields — pattern, the
field it is read from (`payee` or `note`), the match kind (`contains`, `starts with`, `is exactly`)
and the category — because those four are the identity of a rule; `field` and `match_kind` are not
patchable, so a rule that should look elsewhere is a new rule. `exact` is only offered for a payee,
since the API refuses `note` + `exact`.

The list carries every rule, archived ones included (`?include_archived=true`), dimmed: Archive
sends `PATCH /api/categorization/rules/{ref}` with `{archived: true}`, Restore sends `false`, and
nothing is deleted. The row reads `indomaret | payee contains | Unsorted` — pattern first, in mono,
because it is the thing being matched literally.

Between the form and the list is **Try a line**: type a payee name or a raw statement line and
`GET /api/categorization/suggest` answers the category, the `why` sentence and the tier
(`payee_default`, `rule_exact`, `rule_contains`, `none`). It writes nothing, which is what makes it
safe to poke at while tuning a pattern.

## Activity — one journal for the instance

`/settings/activity` is `GET /api/audit` with no entity pinned: every create, update, reverse,
approve, reject and revoke, newest first, filterable by kind and action. Each line links to the row
it changed — an entry, an account (or a category, chosen by the account's kind), a payee, a rule, a
token — so reading the log ends in fixing the thing. The entity pages keep their own timeline; the
history panel that used to sit on every account, category and payee is gone, because three copies
of one journal is three places to look.

## Statements — a draft, not a backlog

`/manage/imports` takes one CSV (`occurred_on`, `amount_minor`, `description`, optional
`currency`), one account the rows move through, and nothing else. The upload answers a **draft**:
`POST /api/imports` writes `import_batches` plus its rows and posts nothing. The idempotency key is
minted when the file is chosen (`statement-<base36 clock>`), so a retry of the same upload resumes
the same draft instead of writing a second one.

`/manage/imports/{ref}` is the review: every row carries the verdict the upload computed
(`duplicate`, `possible duplicate`, `already imported`, `does not parse`) and its own status, and
the one button per row flips it between `accepted` and `skipped` through
`PATCH /api/imports/{ref}/rows/{index}` — absolute values only, so a retry changes nothing. The
panel's two actions close the batch: `commit` posts the accepted rows (each with
`idempotency_key = import:<file_hash>:<row_index>`, so a replay resumes instead of duplicating),
`reject` keeps the rows and the file and posts nothing. A closed batch shows no buttons at all, and
the event log under it is `GET /api/imports/{ref}/events`: `uploaded`, the row verdicts, one
`committing` per chunk, then `committed` or `rejected`.

## Analytics — a year, and the views you saved

`/analytics` opens on twelve months: `GET /api/analytics/months` for the series, whose
`spend_minor`, `income_minor` and `net_minor` all reach the screen — the bars are the spend, the
line under the heading is all three, and a bar's tooltip names them per month rather than throwing
two of the three away. `GET /api/analytics/categories` fills the breakdown, and each row keeps the
window it covers (`first_occurred_on` / `last_occurred_on`) in its title.

Below that is **Saved views**, the three custom routes end to end. The form posts
`name`, `namespace` and `chart`; the answer is a ref, and because the API has no list route the ref
this browser created is kept in `localStorage` (`lib/saved-views.ts`) — lose the browser and you
lose the shortcut, never the view. A view saved elsewhere is opened by pasting its ref.

Running one is `GET /api/analytics/custom/{ref}?from&to`, which echoes the query, so the drawing
follows what was stored: `months` + `bar` is the bar chart, `months` + `line` is a polyline over the
same points, `categories` + `pie` is a conic-gradient with the amounts beside it, `categories` +
`bar` is the proportional rows. The picker offers only those pairs, and changing one sends
`PATCH /api/analytics/custom/{ref}` with `{chart}` and re-renders from the answer.

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
- **A field is a label and a control.** No field hints anywhere: if a label cannot carry the rule,
  the rule belongs in the copy that owns the form, not under every input. `Field` accepts `hint`
  and ignores it, so an old call site compiles and shows nothing.
- **No trailing ellipsis.** A placeholder names what goes there (`coffee, taxi, salary`), it does
  not trail off; a loading state says `Loading` and stops. The one glyph kept is the pagination's
  single `⋯`, which is a symbol, not three typed dots.

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
