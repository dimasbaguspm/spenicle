# CLAUDE.md — Frontend Web

Spenicle web frontend: React 19 + TypeScript + Vite + Tailwind CSS v4.

## Commands

```bash
cd apps/frontend-web
bun install                         # Install dependencies
bun run dev                         # Start dev server (port 3000)
bun run build                       # TypeScript check + production build
bun run check                       # TypeScript type check only
bun run generate:types              # Regenerate API types from backend OpenAPI spec
```

## Tech Stack

- **Framework:** React 19, TypeScript 5.9 (strict mode)
- **Build:** Vite 6, path alias `@/` → `./src`
- **Routing:** React Router v7 (`createBrowserRouter`)
- **Server State:** TanStack Query v5
- **HTTP Client:** Axios + query-string serialization
- **Styling:** Tailwind CSS v4 + Versaur UI library (`@dimasbaguspm/versaur`)
- **Forms:** React Hook Form
- **Charts:** Recharts
- **Dates:** dayjs
- **Icons:** lucide-react
- **Package Manager:** Bun

## Project Structure

```
src/
├── components/       # App-wide layout (AppLayout, top-bar, bottom-bar)
├── constant/         # Route constants (page-routes, drawer-routes, modal-routes, bottom-sheet-routes)
├── hooks/
│   ├── use-api/      # API hooks (base/ + built/ pattern)
│   ├── use-filter-state/  # Filter hooks (base/ + built/ pattern)
│   ├── use-debounced-state/
│   └── use-is-online/
├── lib/              # Pure utilities (format-price, format-date, format-data, when, name-to-initial)
├── providers/        # Context providers (session, auth, drawer, modal, bottom-sheet)
├── router/
│   ├── page/         # Full-page routes + page-router.tsx
│   ├── drawer/       # Slide-in panel components + drawer-router.tsx
│   ├── modal/        # Dialog components + modal-router.tsx
│   ├── bottom-sheet/ # Mobile sheet components
│   └── floating-actions/  # FAB component (reads route handles)
├── types/
│   ├── generated/    # Auto-generated OpenAPI types (never edit)
│   └── schemas.ts    # Re-exported custom types
└── ui/               # Reusable presentational components (cards, filter-fields, statistics)
```

## Documentation

Detailed docs are in `docs/`. **Read before making changes.**

| Doc | Covers |
|-----|--------|
| [docs/routing.md](docs/routing.md) | 4-layer routing, URL-based overlay state, protected routes, FABs |
| [docs/state-management.md](docs/state-management.md) | Provider stack, SessionProvider, AuthProvider, overlay providers |
| [docs/api-integration.md](docs/api-integration.md) | Tuple-return hooks, query/mutation patterns, cache invalidation |
| [docs/filter-state.md](docs/filter-state.md) | Base/built filter hooks, URL vs state adapters |
| [docs/ui-components.md](docs/ui-components.md) | Card, filter field, and statistic component patterns |
| [docs/utilities.md](docs/utilities.md) | formatPrice, formatDate, formatData, When component |
| [docs/conventions.md](docs/conventions.md) | File naming, imports, component structure, TypeScript rules |

## Critical Patterns

### API Hooks — Tuple Returns

Hooks return tuples, **not objects**:

```typescript
// Query: [data, error, state, refetch]
const [accounts, error, { isLoading }, refetch] = useApiAccountsPaginatedQuery({ pageSize: 10 });

// Mutation: [mutateAsync, error, states, reset]
const [createAccount, , { isPending }] = useApiCreateAccount();
await createAccount({ name: "Savings", accountType: "savings", currency: "IDR", amount: 0 });
```

Hook naming: `useApi{Resource}sPaginatedQuery`, `useApi{Resource}sInfiniteQuery`, `useApi{Resource}Query`, `useApiCreate{Resource}`, `useApiUpdate{Resource}`, `useApiDelete{Resource}`.

### Overlay Navigation — URL-Based

Drawers, modals, and bottom sheets are stored in URL search params:

```typescript
const { openDrawer, closeDrawer, drawerId, params, state } = useDrawerProvider();

openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, { accountId: 123, tabId: "details" });
// URL: ?drawer=account-view~eyJhY2NvdW50SWQiOjEyMywidGFiSWQiOiJkZXRhaWxzIn0=

openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, { accountId: 123, tabId: "statistic" }, { replace: true });
// Tab switch without history entry

closeDrawer(); // navigate(-1)
```

Same pattern for `useModalProvider()` (`openModal`/`closeModal`/`modalId`) and `useBottomSheetProvider()`.

### Filter State — URL or In-Memory

```typescript
// URL-based (default) — syncs to search params
const filters = useAccountFilter();
filters.replaceSingle("type", "checking");
const { type, name } = filters.appliedFilters;

// In-memory — for drawer statistic tabs
const filters = useStatisticFilter({ adapter: "state" });
const { startDate, endDate } = filters.getPeriodDates();
```

### Conditional Rendering — `When` Component

```typescript
import { When } from "@/lib/when";

<When condition={hasBudget}>
  <Badge color={budgetIntent}>{budgetText}</Badge>
</When>
```

### Data Formatting — `formatData` Utilities

```typescript
import { formatAccountData } from "@/lib/format-data";

const { name, initialName, formattedAmount, variant, hasBudget, budgetText, budgetIntent } =
  formatAccountData(account);
```

Available: `formatAccountData`, `formatCategoryData`, `formatTransactionData`, `formatTransactionTemplateData`.

### Types — Always Generated

```typescript
import type { AccountModel, AccountCreateModel } from "@/types/schemas";
```

Never manually define API types. Run `bun run generate:types` after backend schema changes.

## Common Workflows

### Adding a New Page

1. Add route constant in `src/constant/page-routes.ts`
2. Create page component in `src/router/page/{page-name}/`
3. Register route in `src/router/page/page-router.tsx` with `lazy()`
4. (Optional) Add FAB config in route `handle`

### Adding a New Drawer

1. Add route constant in `src/constant/drawer-routes.ts`
2. Create drawer component in `src/router/drawer/{drawer-name}/`
3. Add case in `src/router/drawer/drawer-router.tsx`

### Adding a New API Hook

1. Add endpoint to `ENDPOINTS` in `src/hooks/use-api/constant.ts`
2. Add query key to `QUERY_KEYS` in `src/hooks/use-api/queries-keys.ts`
3. Create hooks in `src/hooks/use-api/built/{resource}.ts`
4. Export from `src/hooks/use-api/built/index.ts`

### Adding a New Filter Hook

1. Create in `src/hooks/use-filter-state/built/use-{resource}-filter.ts`
2. Define `FilterModel`, label Map, `appliedFilters`, `humanizedFilters`
3. Export from `src/hooks/use-filter-state/built/index.ts`
4. (Optional) Create filter fields component in `src/ui/{resource}-filter-fields/`

## Rules

- **No `any`** — Use `unknown` and narrow, or generic types
- **No manual API types** — Always use generated types from `@/types/schemas`
- **kebab-case files, PascalCase exports** — `account-card.tsx` → `AccountCard`
- **Barrel exports** — Always include `index.ts` for directories
- **Hooks prefix** — `use-` for files, `use` for function names
- **Import order** — External → Internal (`@/`) → Relative → Styles
- **`When` over `&&`** — Use `When` component for conditional rendering in JSX
- **`formatData` over inline** — Use format utilities, don't format in components
