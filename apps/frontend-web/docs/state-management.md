# State Management

Spenicle Web uses **React Context providers** for app-level state, **TanStack Query** for server state, and **URL search parameters** for overlay and filter state.

## Provider Architecture

```
<SessionProvider>             ← Token storage (BrowserSession singleton)
  <AuthProvider>              ← Authentication state + token refresh
    <DrawerProvider>          ← Drawer overlay state (URL-based)
      <ModalProvider>         ← Modal overlay state (URL-based)
        <BottomSheetProvider> ← Bottom sheet state (URL-based)
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

**Location:** `src/providers/session-provider/`

**Storage:**

- Access token → `sessionStorage` (cleared on tab close)
- Refresh token → `localStorage` (persists across sessions)

**Usage:**

```typescript
import { useSessionProvider } from "@/providers/session-provider";

const { browserSession } = useSessionProvider();

// Set tokens after login
browserSession.setTokens({ access_token: "...", refresh_token: "..." });

// Read tokens
browserSession.accessToken;
browserSession.refreshToken;

// Clear on logout
browserSession.clearSession();
```

**Implementation:** The `BrowserSession` class (`src/providers/session-provider/browser-session.ts`) is a singleton that:
- Stores access token in `sessionStorage`, refresh token in `localStorage`
- Dispatches custom `session-change` events on mutation
- Supports `subscribe()` for reactive updates (compatible with `useSyncExternalStore`)
- Listens for cross-tab `storage` events

### AuthProvider

**Purpose:** High-level authentication state with automatic token refresh.

**Location:** `src/providers/auth-provider/`

**Usage:**

```typescript
import { useAuthProvider } from "@/providers/auth-provider";

const { isAuthenticated, accessToken, refreshToken, handleSetTokens, handleClearSession } =
  useAuthProvider();

// After login
handleSetTokens({ access_token: "...", refresh_token: "..." });

// Logout
handleClearSession();
```

**Behavior:**
- Wraps `SessionProvider` — reads tokens from `BrowserSession`
- On mount, if refresh token exists but access token is missing, automatically calls the refresh endpoint
- Shows `PageLoader` while token refresh is in progress
- Exposes `isAuthenticated` (derived from `!!accessToken`)

### DrawerProvider

**Purpose:** Manage drawer overlay state via URL search parameters.

**Location:** `src/providers/drawer-provider/`

**API:**

```typescript
import { useDrawerProvider } from "@/providers/drawer-provider";

const { isOpen, drawerId, params, state, openDrawer, closeDrawer } = useDrawerProvider();
```

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `boolean` | Whether a drawer is currently open |
| `drawerId` | `string \| null` | Current drawer route ID |
| `params` | `Record<string, string \| number> \| null` | URL-encoded params (persists on refresh) |
| `state` | `Record<string, unknown> \| null` | Navigation state (lost on refresh) |
| `openDrawer` | `(id, params?, opts?) => void` | Open a drawer |
| `closeDrawer` | `() => void` | Close drawer (navigates back) |

**Open options:**

```typescript
openDrawer(drawerId, params?, {
  replace?: boolean;   // Replace history entry (for tab switching)
  state?: object;      // Ephemeral navigation state
});
```

See [routing.md](./routing.md) for URL encoding details and examples.

### ModalProvider

**Purpose:** Manage modal dialog state via URL search parameters.

**Location:** `src/providers/modal-provider/`

**API:** Identical pattern to DrawerProvider with `modal` search param key:

```typescript
import { useModalProvider } from "@/providers/modal-provider";

const { isOpen, modalId, params, state, openModal, closeModal } = useModalProvider();

openModal(MODAL_ROUTES.LOGOUT_CONFIRMATION);
openModal(MODAL_ROUTES.ACCOUNT_DELETE_CONFIRMATION, undefined, {
  state: { accountId: 123 },
});
closeModal();
```

### BottomSheetProvider

**Purpose:** Manage bottom sheet overlay state via URL search parameters.

**Location:** `src/providers/bottom-sheet-provider/`

**API:** Identical pattern with `bottom-sheet` search param key:

```typescript
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";

const { isOpen, bottomSheetId, params, state, openBottomSheet, closeBottomSheet } =
  useBottomSheetProvider();

openBottomSheet(BOTTOM_SHEET_ROUTES.MENU);
closeBottomSheet();
```

## Provider Folder Structure

Each provider follows a consistent structure:

```
provider-name/
├── index.ts                  # Barrel export
├── context.ts                # React Context definition
├── provider.tsx              # Provider component (or named file)
├── use-provider-name.ts      # Consumer hook
├── types.ts                  # TypeScript interfaces
└── helpers.ts                # Utility functions (if needed)
```

## State Categories

### Server State (TanStack Query)

All API data is managed through TanStack Query via hooks in `src/hooks/use-api/`. See [api-integration.md](./api-integration.md).

```typescript
const [accounts, , { isLoading }] = useApiAccountsPaginatedQuery({ pageSize: 10 });
```

### URL State (Search Parameters)

Used for overlays (drawer/modal/bottom sheet) and filters. See [filter-state.md](./filter-state.md).

```typescript
// Overlay state
// URL: ?drawer=account-view~eyJhY2NvdW50SWQiOjEyM30=

// Filter state (via useFilterState hooks)
const filters = useAccountFilter();
filters.replaceSingle("type", "checking");
// URL: ?type=checking
```

### Component State (useState)

Used for local, ephemeral state:

```typescript
const [isEditing, setIsEditing] = useState(false);
const [viewMode, setViewMode] = useState<"recent" | "upcoming">("recent");
```

## Best Practices

### When to Use Providers

**Use Providers For:**
- Cross-cutting concerns (auth, theme)
- Overlay state (drawer, modal, bottom sheet)
- App-wide settings

**Don't Use Providers For:**
- Data fetching (use TanStack Query)
- Local component state (use `useState`)
- Derived state (use `useMemo`)
- Props that can be passed down 1-2 levels

### Provider Performance

```typescript
// Memoize context value to prevent unnecessary re-renders
const contextValue = useMemo(
  () => ({ isOpen, drawerId, params, state, openDrawer, closeDrawer }),
  [isOpen, drawerId, params, state, openDrawer, closeDrawer]
);
```

### State Flow

```
User Action
    ↓
Component Event Handler
    ↓
    ├─→ Local State (useState)
    ├─→ Provider Method (openDrawer, closeModal, etc.)
    ├─→ API Mutation (useApiCreateAccount)
    └─→ URL State (useFilterState)
    ↓
State Update (React re-render / URL change / cache update)
    ↓
UI Update
```
