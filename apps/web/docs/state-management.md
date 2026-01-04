# State Management

Spenicle Web uses **React Context providers** for app-level state, avoiding external state management libraries.

## Provider Architecture

```
<SessionProvider>           ← Token storage
  <AuthProvider>            ← Authentication state
    <DrawerProvider>        ← Drawer overlay state
      <ModalProvider>       ← Modal overlay state
        <BottomSheetProvider>  ← Bottom sheet state
          <App />
        </BottomSheetProvider>
      </ModalProvider>
    </DrawerProvider>
  </AuthProvider>
</SessionProvider>
```

## Core Providers

### SessionProvider

**Purpose:** Manage authentication tokens with appropriate storage strategies.

**Storage:**

- Access token → `sessionStorage` (cleared on tab close)
- Refresh token → `localStorage` (persists across sessions)

**Location:** `src/providers/session-provider/`

**Usage:**

```typescript
import { useSessionProvider } from "@/providers/session-provider";

const { accessToken, refreshToken, setTokens, clearSession } =
  useSessionProvider();

// Set tokens after login
setTokens({ access_token: "...", refresh_token: "..." });

// Clear on logout
clearSession();

// Check if authenticated
const isAuthenticated = !!accessToken;
```

**Implementation Detail:**

- Uses `BrowserSession` class (singleton in `src/core/browser-session.ts`)
- `useSyncExternalStore` for reactive updates
- Cross-tab sync via storage events

### AuthProvider

**Purpose:** High-level authentication state and user information.

**Location:** `src/providers/auth-provider/`

**Usage:**

```typescript
import { useAuthProvider } from "@/providers/auth-provider";

const { isAuthenticated, login, logout, user } = useAuthProvider();

// Login
await login({ email, password });

// Logout
await logout();

// Access user info
console.log(user?.name);
```

**Responsibilities:**

- Wraps SessionProvider
- Manages login/logout flows
- Stores user profile data
- Handles token refresh logic

### DrawerProvider

**Purpose:** Manage drawer overlay state and navigation.

**Location:** `src/providers/drawer-provider/`

**Usage:**

```typescript
import { useDrawerProvider } from "@/providers/drawer-provider";

const { open, close, currentRoute, params, isOpen } = useDrawerProvider();

// Open drawer
open(DRAWER_ROUTES.ACCOUNT_CREATE);

// Open with params
open(DRAWER_ROUTES.ACCOUNT_VIEW, { id: "123" });

// Close
close();
```

**State:**

```typescript
{
  isOpen: boolean;
  currentRoute: string | null;
  params?: Record<string, any>;
}
```

### ModalProvider

**Purpose:** Manage modal dialog state and navigation.

**Location:** `src/providers/modal-provider/`

**Usage:**

```typescript
import { useModalProvider } from "@/providers/modal-provider";

const { open, close, currentRoute, params, isOpen } = useModalProvider();

// Open modal
open(MODAL_ROUTES.DELETE_CONFIRMATION, { itemId: "123" });

// Close
close();
```

**State:** Same as DrawerProvider

### BottomSheetProvider

**Purpose:** Manage bottom sheet overlay state (mobile-first).

**Location:** `src/providers/bottom-sheet-provider/`

**Usage:**

```typescript
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";

const { open, close, currentRoute, params, isOpen } = useBottomSheetProvider();

// Open bottom sheet
open(BOTTOM_SHEET_ROUTES.MENU);

// Close
close();
```

**State:** Same as DrawerProvider

## Provider Pattern Structure

Each provider follows a consistent structure:

```
provider-name/
├── index.ts                  # Barrel export
├── context.ts                # React Context definition
├── provider.tsx              # Provider component
├── use-provider-name.ts      # Consumer hook
├── types.ts                  # TypeScript interfaces
└── helpers.ts                # Utility functions (if needed)
```

### Example Provider Implementation

```typescript
// context.ts
import { createContext } from 'react';
import type { ProviderContextType } from './types';

export const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

// provider.tsx
export const Provider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState(...);

  const value = useMemo(() => ({
    // state and methods
  }), [state]);

  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  );
};

// use-provider-name.ts
export const useProvider = () => {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProvider must be used within Provider');
  }
  return context;
};
```

## Local State Patterns

### Component State

Use `useState` for local component state:

```typescript
const [isLoading, setIsLoading] = useState(false);
const [formData, setFormData] = useState({ name: "", email: "" });
```

### Server State

Use TanStack Query hooks (via `use-api`):

```typescript
import { useGetAccounts, useCreateAccount } from "@/hooks/use-api";

// Fetching
const { data, isLoading, error } = useGetAccounts();

// Mutations
const createAccount = useCreateAccount({
  onSuccess: () => {
    queryClient.invalidateQueries(["accounts"]);
  },
});
```

### URL State

Use `useSearchParams` for URL-based state:

```typescript
const [searchParams, setSearchParams] = useSearchParams();

const page = searchParams.get("page") || "1";
const query = searchParams.get("q") || "";

setSearchParams({ page: "2", q: "search term" });
```

### Custom Hooks for Reusable State

```typescript
// hooks/use-filter-state/use-filter-state.ts
export const useFilterState = (initialFilters) => {
  const [filters, setFilters] = useState(initialFilters);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(initialFilters);

  return { filters, updateFilter, resetFilters };
};
```

## State Flow Diagram

```
User Action
    ↓
Component Event Handler
    ↓
    ├─→ Local State (useState)
    ├─→ Provider Method (useProvider)
    ├─→ API Mutation (use-api)
    └─→ Navigation (useNavigate)
    ↓
State Update
    ↓
React Re-render
    ↓
UI Update
```

## Best Practices

### When to Use Providers

**✅ Use Providers For:**

- Cross-cutting concerns (auth, theme, i18n)
- Overlay state (drawer, modal, bottom sheet)
- App-wide settings
- Features used by multiple unrelated components

**❌ Don't Use Providers For:**

- Data fetching (use TanStack Query)
- Local component state
- Derived state (use `useMemo`)
- Props that can be passed down 1-2 levels

### Provider Performance

**Optimization tips:**

```typescript
// ✅ Memoize context value
const value = useMemo(
  () => ({
    state,
    actions,
  }),
  [state]
);

// ✅ Split large contexts
// AuthProvider (user info) + PermissionsProvider (permissions)
// Instead of one giant AuthProvider

// ✅ Use context selectors (if needed)
const userName = useAuthProvider((state) => state.user?.name);
```

### State Initialization

```typescript
// ✅ Initialize from localStorage
const [theme, setTheme] = useState(() => {
  return localStorage.getItem("theme") || "light";
});

// ✅ Sync with storage
useEffect(() => {
  localStorage.setItem("theme", theme);
}, [theme]);
```

### Error Boundaries

Wrap providers with error boundaries:

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <SessionProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
  </SessionProvider>
</ErrorBoundary>
```

## Testing Providers

```typescript
// Mock provider for tests
const TestProviderWrapper = ({ children }) => (
  <SessionProvider>
    <AuthProvider>{children}</AuthProvider>
  </SessionProvider>
);

render(<ComponentUnderTest />, { wrapper: TestProviderWrapper });
```

## Future Enhancements

- Theme provider (dark/light mode)
- i18n provider (multi-language support)
- Feature flag provider
- Analytics provider
- Notification provider (toast system)
