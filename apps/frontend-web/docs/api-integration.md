# API Integration

Guide for integrating with the Spenicle backend API using type-safe hooks.

## Overview

The web app communicates with the backend REST API using:

- **Type Safety:** OpenAPI-generated TypeScript types
- **Data Fetching:** TanStack Query v5 (React Query)
- **HTTP Client:** Axios with query-string serialization
- **Custom Hooks:** Tuple-return wrappers in `src/hooks/use-api/`

## OpenAPI Type Generation

```bash
cd apps/frontend-web
bun run generate:types
```

This fetches the OpenAPI spec from the running backend and generates TypeScript types.

**Output:** `src/types/generated/openapi.ts`

Custom schema types are re-exported from `src/types/schemas.ts` for convenient imports:

```typescript
import type { AccountModel, AccountCreateModel } from "@/types/schemas";
```

> **Never manually define API types.** Always use the generated types.

## Directory Structure

```
src/hooks/use-api/
├── index.ts                        # Re-exports built/
├── constant.ts                     # BASE_URL, BASE_QUERY_KEYS, ENDPOINTS
├── queries-keys.ts                 # QUERY_KEYS factory
├── base/                           # Base hook implementations
│   ├── use-api-query.ts            # Single query (GET)
│   ├── use-api-infinite-query.ts   # Infinite scroll query (GET)
│   └── use-api-mutate.ts           # Mutations (POST/PUT/PATCH/DELETE)
└── built/                          # Per-resource hook definitions
    ├── index.ts                    # Re-exports all resources
    ├── accounts.ts
    ├── categories.ts
    ├── transactions.ts
    ├── transaction-templates.ts
    ├── insights.ts
    └── auth.ts
```

All hooks are imported from the top-level barrel:

```typescript
import { useApiAccountsPaginatedQuery, useApiCreateAccount } from "@/hooks/use-api";
```

## Query Hooks

Query hooks wrap TanStack Query's `useQuery` and return a **4-element tuple**:

```typescript
type UseApiQueryResult<TData, TError> = [
  data: TData | null,
  error: TError | null,
  state: QueryState,
  refetch: (options?: RefetchOptions) => Promise<...>
];
```

### Usage

```typescript
import { useApiAccountsPaginatedQuery } from "@/hooks/use-api";

const MyComponent = () => {
  const [accounts, error, { isLoading }, refetch] = useApiAccountsPaginatedQuery({
    pageSize: 10,
    sortBy: "name",
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorMessage />;

  return <div>{accounts?.items.map(/* ... */)}</div>;
};
```

### Available State Flags

The third tuple element contains all TanStack Query status flags:

| Flag | Description |
|------|-------------|
| `isLoading` | First load (no cached data) |
| `isFetching` | Any fetch in progress (including background refetch) |
| `isPending` | Mutation/query not yet resolved |
| `isSuccess` | Query succeeded |
| `isError` | Query failed |
| `isRefetching` | Background refetch in progress |
| `isStale` | Data is stale |

### Query Options

```typescript
const [data] = useApiAccountsPaginatedQuery(
  { pageSize: 10 },
  {
    enabled: isAuthenticated,     // Conditionally enable
    staleTime: 5 * 60 * 1000,    // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,      // Garbage collect after 10 minutes
    retry: true,                  // Retry on failure
    silentError: true,            // Suppress snackbar on error
    onSuccess: (data) => {},      // Callback on success
    onError: (error) => {},       // Callback on error
  }
);
```

### Query Hook Naming Convention

| Pattern | Example | Purpose |
|---------|---------|---------|
| `useApi{Resource}sPaginatedQuery` | `useApiAccountsPaginatedQuery` | Paginated list |
| `useApi{Resource}sInfiniteQuery` | `useApiAccountsInfiniteQuery` | Infinite scroll list |
| `useApi{Resource}Query` | `useApiAccountQuery` | Single item by ID |
| `useApi{Resource}Statistic{Name}Query` | `useApiAccountStatisticBurnRateQuery` | Statistics endpoint |
| `useApiInsights{Name}Query` | `useApiInsightsTransactionsSummaryQuery` | Insights/summary data |

## Infinite Query Hooks

Infinite queries return a **4-element tuple** with pagination controls:

```typescript
type UseApiInfiniteQueryResult<TData, TError> = [
  data: TData[],             // Flattened items from all pages
  error: TError | null,
  state: InfiniteQueryState,  // Includes hasNextPage, isFetchingNextPage
  funcs: { fetchNextPage, fetchPreviousPage, refetch }
];
```

### Usage

```typescript
const [items, error, { hasNextPage, isFetchingNextPage }, { fetchNextPage }] =
  useApiAccountsInfiniteQuery({ pageSize: 20 });

// Items are automatically flattened from paginated responses
// fetchNextPage() loads the next page and appends items
```

The hook automatically handles paginated response shapes (`{ items, pageNumber, totalPages }`) by concatenating `items` arrays across pages.

## Mutation Hooks

Mutation hooks wrap TanStack Query's `useMutation` and return a **4-element tuple**:

```typescript
type UseApiMutateResult<TData, TVariables, TError> = [
  mutateAsync: (variables: TVariables) => Promise<TData>,
  error: TError | null,
  states: { isError, isIdle, isPending, isSuccess },
  reset: () => void
];
```

### Usage

```typescript
import { useApiCreateAccount, useApiUpdateAccount, useApiDeleteAccount } from "@/hooks/use-api";

// Create
const [createAccount, , { isPending }] = useApiCreateAccount();
await createAccount({
  name: "Savings",
  accountType: "savings",
  currency: "IDR",
  amount: 0,
});

// Update (path params extracted from variables)
const [updateAccount] = useApiUpdateAccount();
await updateAccount({
  id: 123,            // Replaces :id in path
  name: "Updated",    // Sent in request body (id stripped)
});

// Delete
const [deleteAccount] = useApiDeleteAccount();
await deleteAccount({ id: 123 });
```

### Path Parameter Replacement

Mutation hooks support templated paths. Parameters matching `:paramName` are extracted from the variables object, replaced in the URL, and **removed from the request body**:

```typescript
// Definition
useApiMutate<AccountModel, AccountUpdateModel>({
  path: ENDPOINTS.ACCOUNT.BY_ID(":id"),  // → "/accounts/:id"
  method: "PATCH",
});

// Call
await updateAccount({ id: 42, name: "New Name" });
// Request: PATCH /accounts/42
// Body: { name: "New Name" }  ← id is stripped
```

### Error Handling

Mutations automatically show a snackbar on error via `useSnackbars()` from Versaur. To suppress this:

```typescript
useApiMutate<Data, Variables>({
  path: "...",
  method: "POST",
  silentError: true,  // No snackbar on error
});
```

## Cache Invalidation

Mutation hooks handle cache invalidation internally via `onSuccess`. Each mutation invalidates all related query caches:

```typescript
// From built/accounts.ts — useApiCreateAccount
onSuccess: (data) => {
  // Invalidate paginated and infinite lists
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.ACCOUNT_PAGINATED().slice(0, 2),  // ["accounts", "paginated"]
    exact: false,  // Matches all param variations
  });
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.ACCOUNT_INFINITE().slice(0, 2),
    exact: false,
  });
  // Seed the by-id cache with the new data
  queryClient.setQueryData(QUERY_KEYS.ACCOUNT_BY_ID(data.id), data);
};
```

**Cross-resource invalidation:** Transaction mutations also invalidate insights caches since transactions affect summary statistics.

## Query Keys

Centralized in `src/hooks/use-api/queries-keys.ts` using a factory pattern:

```typescript
import { QUERY_KEYS } from "./queries-keys";

// List queries (params serialized as JSON)
QUERY_KEYS.ACCOUNT_PAGINATED(params)
// → ["accounts", "paginated", '{"pageSize":10}']

QUERY_KEYS.ACCOUNT_INFINITE(params)
// → ["accounts", "infinite", '{"pageSize":20}']

// Single item
QUERY_KEYS.ACCOUNT_BY_ID(id, params)
// → ["accounts", "by-id", 42, '{}']

// Statistics (nested)
QUERY_KEYS.ACCOUNT_STATISTICS.BURN_RATE(id, params)
// → ["accounts", "statistics", "burn-rate", 42, '{}']

// Transactions (nested)
QUERY_KEYS.TRANSACTIONS.PAGINATED(params)
// → ["transactions", "paginated", '{}']

// Insights (nested)
QUERY_KEYS.INSIGHTS.TRANSACTIONS_SUMMARY(params)
// → ["insights", "transactions-summary", '{}']
```

**Base keys** in `constant.ts` define the root segments:

```typescript
const BASE_QUERY_KEYS = {
  ACCOUNTS: ["accounts"],
  CATEGORIES: ["categories"],
  TRANSACTIONS: ["transactions"],
  TRANSACTION_TEMPLATES: ["transaction-templates"],
  INSIGHTS: ["insights"],
};
```

**Invalidation pattern:** Use `.slice(0, 2)` with `exact: false` to match all param variations of a query type.

## Endpoints

All API paths are centralized in `ENDPOINTS` in `src/hooks/use-api/constant.ts`:

```typescript
ENDPOINTS.ACCOUNT.PAGINATED           // "/accounts"
ENDPOINTS.ACCOUNT.BY_ID(42)           // "/accounts/42"
ENDPOINTS.ACCOUNT.STATISTICS.BURN_RATE(42) // "/accounts/42/statistics/burn-rate"
ENDPOINTS.TRANSACTIONS.PAGINATED      // "/transactions"
ENDPOINTS.INSIGHTS.TRANSACTIONS_SUMMARY // "/summary/transactions"
```

## Authentication

### Token Injection

Every API request automatically includes the Bearer token from `SessionProvider`:

```typescript
headers: {
  Authorization: `Bearer ${browserSession.accessToken}`,
}
```

### 401 Handling

On 401 responses, `browserSession.clearSession()` is called, which clears tokens and redirects to login.

### Online Status

All queries check `useIsOnline()` and disable fetching when offline:

```typescript
const isEnable = enabled && isOnline;
```

## Adding a New API Hook

1. **Add endpoint** to `ENDPOINTS` in `src/hooks/use-api/constant.ts`
2. **Add query key** to `QUERY_KEYS` in `src/hooks/use-api/queries-keys.ts`
3. **Create hooks** in `src/hooks/use-api/built/{resource}.ts`:

```typescript
// Query hook
export const useApiWidgetsPaginatedQuery = (
  params: WidgetSearchModel,
  options?: Partial<UseApiQueryOptions<WidgetsPagedModel, WidgetSearchModel, unknown>>,
) => {
  return useApiQuery<WidgetsPagedModel, WidgetSearchModel>({
    ...options,
    queryKey: QUERY_KEYS.WIDGET_PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.WIDGETS.PAGINATED,
  });
};

// Mutation hook
export const useApiCreateWidget = () => {
  const queryClient = useQueryClient();
  return useApiMutate<WidgetModel, WidgetCreateModel>({
    path: ENDPOINTS.WIDGETS.PAGINATED,
    method: "POST",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WIDGET_PAGINATED().slice(0, 2),
        exact: false,
      });
    },
  });
};
```

4. **Export** from `src/hooks/use-api/built/index.ts`
5. **Regenerate types** if backend schema changed: `bun run generate:types`
