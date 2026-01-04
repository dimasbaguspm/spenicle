# API Integration

Guide for integrating with the Spenicle backend API.

## Overview

The web app communicates with the backend REST API using:

- **Type Safety:** OpenAPI-generated TypeScript types
- **Data Fetching:** TanStack Query (React Query)
- **API Client:** Custom hooks in `src/hooks/use-api/`

## OpenAPI Type Generation

### Generate Types

```bash
cd apps/web
bun run generate:openapi-types
```

This fetches the OpenAPI spec from the backend and generates TypeScript types.

**Output:** `src/types/generated/openapi.ts`

### What Gets Generated

```typescript
// Request types
export interface AuthLoginRequest {
  email: string;
  password: string;
}

// Response types
export interface AuthLoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserModel;
}

// Model types
export interface AccountModel {
  id: string;
  name: string;
  type: "expense" | "income" | "investment";
  balance: number;
  created_at: string;
  updated_at: string;
}
```

### Usage

```typescript
import type {
  AccountModel,
  AccountListResponse,
  CreateAccountRequest,
} from "@/types/generated/openapi";

// Use in components
const accounts: AccountModel[] = [];
```

## API Hooks

### Location

```
src/hooks/use-api/
├── index.ts               # Main exports
├── constant.ts            # API base URL
├── queries-keys.ts        # Query key factory
├── base/                  # Base API client
│   └── client.ts
└── built/                 # Generated API hooks
    ├── accounts.ts
    ├── categories.ts
    ├── transactions.ts
    └── ...
```

### Query Hooks

**GET requests** use query hooks:

```typescript
import { useGetAccounts, useGetAccount } from "@/hooks/use-api";

// List query
const { data, isLoading, error } = useGetAccounts({
  type: "expense",
  limit: 20,
});

// Single item query
const { data: account } = useGetAccount("account-id");

// With query options
const { data, refetch } = useGetAccounts(
  { type: "expense" },
  {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }
);
```

### Mutation Hooks

**POST/PUT/DELETE requests** use mutation hooks:

```typescript
import {
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "@/hooks/use-api";
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

// Create
const createAccount = useCreateAccount({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    toast.success("Account created");
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

createAccount.mutate({
  name: "Savings",
  type: "expense",
  balance: 0,
});

// Update
const updateAccount = useUpdateAccount({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  },
});

updateAccount.mutate({
  id: "account-id",
  data: { name: "Updated Name" },
});

// Delete
const deleteAccount = useDeleteAccount({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  },
});

deleteAccount.mutate("account-id");
```

## Query Keys

**Centralized query key factory** in `src/hooks/use-api/queries-keys.ts`:

```typescript
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    lists: () => [...queryKeys.accounts.all, "list"] as const,
    list: (filters: AccountFilters) =>
      [...queryKeys.accounts.lists(), filters] as const,
    details: () => [...queryKeys.accounts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.accounts.details(), id] as const,
  },

  transactions: {
    // ...
  },
};

// Usage
queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
queryClient.invalidateQueries({ queryKey: queryKeys.accounts.detail(id) });
```

## Authentication

### Token Management

Tokens are automatically included in API requests:

```typescript
// src/hooks/use-api/base/client.ts
const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = browserSession.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Token Refresh

Automatic token refresh on 401 responses:

```typescript
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = browserSession.getRefreshToken();

      if (refreshToken) {
        try {
          const { access_token } = await refreshAccessToken(refreshToken);
          browserSession.setAccessToken(access_token);

          // Retry original request
          error.config.headers.Authorization = `Bearer ${access_token}`;
          return client.request(error.config);
        } catch {
          // Refresh failed, logout
          browserSession.clearSession();
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);
```

## Error Handling

### API Errors

```typescript
import { useGetAccounts } from "@/hooks/use-api";

const { data, error, isError } = useGetAccounts();

if (isError) {
  // error is typed as AxiosError
  console.error(error.response?.data);

  // Show user-friendly message
  if (error.response?.status === 404) {
    return <NotFound />;
  }

  return <ErrorMessage message={error.message} />;
}
```

### Global Error Handler

```typescript
// In QueryClientProvider setup
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onError: (error) => {
        // Log to error tracking service
        console.error("Query error:", error);
      },
    },
    mutations: {
      onError: (error) => {
        // Show toast notification
        toast.error("Something went wrong");
      },
    },
  },
});
```

## Optimistic Updates

```typescript
const updateAccount = useUpdateAccount({
  onMutate: async (variables) => {
    // Cancel ongoing queries
    await queryClient.cancelQueries({ queryKey: ["accounts"] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(["accounts"]);

    // Optimistically update
    queryClient.setQueryData(["accounts"], (old: Account[]) => {
      return old.map((acc) =>
        acc.id === variables.id ? { ...acc, ...variables.data } : acc
      );
    });

    // Return rollback function
    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    if (context?.previous) {
      queryClient.setQueryData(["accounts"], context.previous);
    }
  },
  onSettled: () => {
    // Refetch to sync with server
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  },
});
```

## Pagination

```typescript
import { useGetTransactions } from "@/hooks/use-api";

const [page, setPage] = useState(1);
const LIMIT = 20;

const { data, isLoading } = useGetTransactions({
  offset: (page - 1) * LIMIT,
  limit: LIMIT,
});

const totalPages = data?.total ? Math.ceil(data.total / LIMIT) : 0;

// Navigate pages
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>;
```

## Infinite Scroll

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";

const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
  useInfiniteQuery({
    queryKey: ["transactions", "infinite"],
    queryFn: ({ pageParam = 0 }) =>
      fetchTransactions({ offset: pageParam, limit: 20 }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.transactions.length < 20) return undefined;
      return allPages.length * 20;
    },
  });

// Render
<InfiniteScroll
  loadMore={fetchNextPage}
  hasMore={hasNextPage}
  isLoading={isFetchingNextPage}
>
  {data?.pages.map((page) =>
    page.transactions.map((tx) => <TransactionCard key={tx.id} {...tx} />)
  )}
</InfiniteScroll>;
```

## Real-Time Updates

### Polling

```typescript
const { data } = useGetAccounts(
  {},
  {
    refetchInterval: 10 * 1000, // Poll every 10 seconds
    refetchIntervalInBackground: false,
  }
);
```

### Manual Refetch

```typescript
const { data, refetch } = useGetAccounts();

// Refetch on window focus
useEffect(() => {
  const handleFocus = () => refetch();
  window.addEventListener("focus", handleFocus);
  return () => window.removeEventListener("focus", handleFocus);
}, [refetch]);
```

## Best Practices

### 1. Centralize API Calls

```typescript
// ❌ Don't call API directly in components
const Component = () => {
  useEffect(() => {
    axios.get("/api/accounts").then(setAccounts);
  }, []);
};

// ✅ Use custom hooks
const Component = () => {
  const { data: accounts } = useGetAccounts();
};
```

### 2. Invalidate Queries

```typescript
// ✅ Invalidate related queries after mutations
const createTransaction = useCreateTransaction({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] }); // Balance changed
    queryClient.invalidateQueries({ queryKey: ["summary"] }); // Stats changed
  },
});
```

### 3. Handle Loading States

```typescript
const { data, isLoading, isFetching } = useGetAccounts();

// isLoading: First load
// isFetching: Background refetch

if (isLoading) return <Skeleton />;
if (!data) return null;

return (
  <>
    {isFetching && <RefreshIndicator />}
    <AccountList accounts={data.accounts} />
  </>
);
```

### 4. Type Safety

```typescript
// ✅ Use generated types
import type { AccountModel } from "@/types/generated/openapi";

const { data } = useGetAccounts();
// data is typed as AccountListResponse

const accounts: AccountModel[] = data?.accounts || [];
```

### 5. Error Boundaries

```typescript
<ErrorBoundary fallback={<ErrorPage />}>
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
</ErrorBoundary>
```

## Debugging

### Enable Query Devtools

```typescript
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>;
```

### Log API Calls

```typescript
// Add axios interceptor
client.interceptors.request.use((config) => {
  console.log("API Request:", config.method?.toUpperCase(), config.url);
  return config;
});

client.interceptors.response.use((response) => {
  console.log("API Response:", response.status, response.config.url);
  return response;
});
```
