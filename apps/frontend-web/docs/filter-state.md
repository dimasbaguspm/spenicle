# Filter State

URL-based filter state management with an adapter pattern for URL or in-memory storage.

## Overview

The filter state system in `src/hooks/use-filter-state/` provides type-safe, CRUD-style operations for managing filter parameters. By default, filters are stored in URL search parameters, making them shareable and bookmarkable. An in-memory adapter is available for temporary contexts like drawer statistics.

## Directory Structure

```
src/hooks/use-filter-state/
├── index.ts                           # Barrel export
├── base/
│   └── use-filter-state.ts            # Base hook with adapter pattern
└── built/
    ├── index.ts                       # Re-exports all built hooks
    ├── use-account-filter.ts
    ├── use-category-filter.ts
    ├── use-transaction-filter.ts
    ├── use-transaction-template-filter.ts
    ├── use-insight-filter.ts
    └── use-statistic-filter.ts
```

## Base Hook

### `useFilterState<T>(options?)`

The base hook provides generic CRUD operations on `URLSearchParams`, backed by either URL search params or in-memory state.

```typescript
import { useFilterState } from "@/hooks/use-filter-state";

const filters = useFilterState<{ name?: string; type?: string[] }>({
  defaultValues: { type: "checking" },
});
```

### API

| Method | Signature | Description |
|--------|-----------|-------------|
| `getSingle` | `(key) => string \| undefined` | Get a single filter value |
| `getAll` | `(key) => string[]` | Get all values for a key (multi-value) |
| `replaceSingle` | `(key, value) => void` | Replace all values for a key |
| `replaceAll` | `(filters) => void` | Replace all filters at once |
| `addSingle` | `(key, value) => void` | Append a value to a key |
| `removeSingle` | `(key, value?) => void` | Remove a specific value, or all values if no value given |
| `removeAll` | `(keys) => void` | Remove all values for multiple keys |

### Options

```typescript
interface UseFilterStateOptions<T> {
  defaultValues?: Partial<T>;          // Initial filter values
  replace?: boolean;                    // Replace history entry (default: true)
  adapter?: "url" | "state";           // Storage adapter (default: "url")
  customAdapter?: FilterStateAdapter;   // Custom adapter implementation
}
```

## Adapter Pattern

### URL Adapter (Default)

Syncs filters to URL search parameters via `useSearchParams` from React Router. Filter changes update the browser URL, making filters shareable and persisted across page refreshes.

```typescript
const filters = useFilterState<MyFilters>();
// URL: /transactions?type=expense&sortBy=date
```

### State Adapter

Stores filters in React `useState` (in-memory). Used for temporary filter contexts where URL persistence is not needed, such as statistic tabs inside drawers.

```typescript
const filters = useFilterState<MyFilters>({ adapter: "state" });
// No URL changes — state is local to the component
```

### Custom Adapter

Implement the `FilterStateAdapter` interface for custom storage:

```typescript
interface FilterStateAdapter {
  getParams: () => URLSearchParams;
  setParams: (params: URLSearchParams) => void;
}
```

## Built Filter Hooks

Built hooks wrap `useFilterState` with a typed `FilterModel`, producing two additional properties:

- **`appliedFilters`** — Typed, processed filter values (numbers parsed, arrays cast, etc.)
- **`humanizedFilters`** — Array of `[key, label]` tuples for displaying active filters in the UI

### Pattern

```typescript
// 1. Define the filter model
interface AccountFilterModel {
  id?: number[];
  name?: string;
  type?: ("checking" | "savings" | ...)[];
  sortBy?: string;
  // ...
}

// 2. Define humanized labels
const accountFilterModel = new Map<keyof AccountFilterModel, string>([
  ["id", "Id"],
  ["name", "Name"],
  ["type", "Type"],
  // ...
]);

// 3. Create the hook
export const useAccountFilter = (opts?) => {
  const filters = useFilterState<AccountFilterModel>(opts);

  const appliedFilters: AccountFilterModel = {
    id: filters.getAll("id").map(Number),           // Parse to numbers
    name: filters.getSingle("name"),                 // Keep as string
    type: filters.getAll("type") as Type[],          // Cast to enum array
    sortBy: filters.getSingle("sortBy") as SortBy,   // Cast to enum
    // ...
  };

  const humanizedFilters = /* build [key, label] pairs for non-empty filters */;

  return { ...filters, appliedFilters, humanizedFilters };
};
```

### Available Hooks

| Hook | Filter Model | Notes |
|------|-------------|-------|
| `useAccountFilter` | `AccountFilterModel` | id, name, type, archived, sortBy, sortOrder, pagination |
| `useCategoryFilter` | `CategoryFilterModel` | id, name, type, archived, sortBy, sortOrder, pagination |
| `useTransactionFilter` | `TransactionFilterModel` | type, date range, account, category, sortBy, pagination |
| `useTransactionTemplateFilter` | `TransactionTemplateFilterModel` | type, frequency, pagination |
| `useInsightFilter` | `InsightFilterModel` | startDate, endDate, frequency |
| `useStatisticFilter` | `StatisticFilterModel` | period (3months/6months/1year) |

### Usage

```typescript
import { useAccountFilter } from "@/hooks/use-filter-state";

const MyComponent = () => {
  const filters = useAccountFilter();

  // Read processed values
  const { type, name, sortBy } = filters.appliedFilters;

  // Modify filters
  filters.replaceSingle("type", "checking");
  filters.removeSingle("type", "savings");
  filters.removeAll(["type", "name"]);

  // Display active filters
  filters.humanizedFilters.map(([key, label]) => (
    <Chip key={key} onRemove={() => filters.removeSingle(key)}>
      {label}
    </Chip>
  ));
};
```

## Statistic Filter

The `useStatisticFilter` hook is a special case that computes date ranges from period strings and is typically used with the **state adapter** inside drawer statistic tabs:

```typescript
import { useStatisticFilter } from "@/hooks/use-filter-state";

const StatisticTab = () => {
  const filters = useStatisticFilter({ adapter: "state" });
  const { startDate, endDate } = filters.getPeriodDates();

  const [stats] = useApiAccountStatisticsQuery(accountId, { startDate, endDate });

  return (
    <ChipSingleInput
      value={filters.appliedFilters.period || "3months"}
      onChange={(value) => filters.replaceSingle("period", value)}
    >
      <ChipSingleInput.Option value="3months">Last 3 Months</ChipSingleInput.Option>
      <ChipSingleInput.Option value="6months">Last Semester</ChipSingleInput.Option>
      <ChipSingleInput.Option value="1year">Last Year</ChipSingleInput.Option>
    </ChipSingleInput>
  );
};
```

**Period mappings:**

| Period | Start Date | End Date |
|--------|------------|----------|
| `3months` | Start of month, 2 months ago | End of current month |
| `6months` | Start of month, 5 months ago | End of current month |
| `1year` | Start of month, 11 months ago | End of current month |

## Integration with Filter Field Components

Built filter hooks connect to filter field UI components in `src/ui/`:

```typescript
import { useTransactionFilter } from "@/hooks/use-filter-state";
import { TransactionFilterFields } from "@/ui/transaction-filter-fields";

const TransactionsPage = () => {
  const filters = useTransactionFilter();

  return (
    <>
      <TransactionFilterFields control={filters} hideType hideDateRange />
      {/* List uses filters.appliedFilters for API params */}
    </>
  );
};
```

Filter field components accept a `control` prop matching the return type of their corresponding filter hook. See [ui-components.md](./ui-components.md) for details.

## Adding a New Filter Hook

1. **Define the filter model** in `src/hooks/use-filter-state/built/use-{resource}-filter.ts`:

```typescript
import type { WidgetSearchModel } from "@/types/schemas";
import { useFilterState, type UseFilterStateOptions, type UseFilterStateReturn } from "../base/use-filter-state";

export interface WidgetFilterModel {
  name?: WidgetSearchModel["name"];
  status?: WidgetSearchModel["status"];
  sortBy?: WidgetSearchModel["sortBy"];
}

export interface UseWidgetFilterReturn extends UseFilterStateReturn<WidgetFilterModel> {
  appliedFilters: WidgetFilterModel;
  humanizedFilters: [keyof WidgetFilterModel, string][];
}
```

2. **Define the label map and implement the hook** following the pattern in `use-account-filter.ts`
3. **Export** from `src/hooks/use-filter-state/built/index.ts`
4. **Create a filter fields component** in `src/ui/widget-filter-fields/` if needed
