# Routing System

Spenicle Web uses a **multi-layer routing architecture** with 4 independent routing layers.

## Architecture Overview

```
┌─────────────────────────────────────┐
│         Page Router (Base)          │  Full page navigation
│  ┌──────────────────────────────┐   │
│  │    Drawer Router (Layer 1)   │   │  Slide-in panels
│  │  ┌────────────────────────┐  │   │
│  │  │  Modal Router (Layer 2)│  │   │  Dialog overlays
│  │  │  ┌──────────────────┐  │  │   │
│  │  │  │ Bottom Sheet     │  │  │   │
│  │  │  │   (Layer 3)      │  │  │   │  Mobile sheets
│  │  │  └──────────────────┘  │  │   │
│  │  └────────────────────────┘  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Why Multi-Layer?

**Traditional SPA routing:**

- `/dashboard` → Dashboard Page
- `/dashboard/new-transaction` → New Transaction Page
- Problems: Loses context, clutters history, back button confusion

**Multi-layer routing:**

- `/dashboard` → Dashboard Page
- Drawer opens → Transaction form (overlay, dashboard stays visible)
- Benefits: Context preserved, clean history, intuitive back behavior

## Provider Stack

All overlay layers are mounted inside protected routes in `src/router/page/page-router.tsx`:

```
<SessionProvider>
  <AuthProvider>
    <ProtectedRoute>
      <DrawerProvider>
        <ModalProvider>
          <BottomSheetProvider>
            <AppLayout>
              <Outlet />          ← Page content
              <DrawerRouter />    ← Drawer overlay
              <ModalRouter />     ← Modal overlay
              <BottomSheetRouter /> ← Bottom sheet overlay
              <FloatingActions /> ← FABs
            </AppLayout>
          </BottomSheetProvider>
        </ModalProvider>
      </DrawerProvider>
    </ProtectedRoute>
  </AuthProvider>
</SessionProvider>
```

## Layer Definitions

### 1. Page Routes

**Location:** `src/router/page/`
**Constants:** `src/constant/page-routes.ts`
**Provider:** React Router v7 (`createBrowserRouter`)

Full-page navigation. Changes the main content area.

```typescript
import { PAGE_ROUTES } from "@/constant/page-routes";
import { useNavigate } from "react-router";

const navigate = useNavigate();
navigate(PAGE_ROUTES.DASHBOARD);       // "/"
navigate(PAGE_ROUTES.TRANSACTIONS);    // "/transactions"
navigate(PAGE_ROUTES.INSIGHTS);        // "/insights"
navigate(PAGE_ROUTES.SETTINGS);        // "/settings"
```

Deep links with metadata are available in `DEEP_PAGE_LINKS`:

```typescript
import { DEEP_PAGE_LINKS } from "@/constant/page-routes";

DEEP_PAGE_LINKS.DASHBOARD.path        // "/"
DEEP_PAGE_LINKS.DASHBOARD.title       // "Dashboard"
DEEP_PAGE_LINKS.DASHBOARD.icon        // HomeIcon (lucide)
DEEP_PAGE_LINKS.TRANSACTIONS_DATE.path(2024, 1, 15)  // "/transactions/2024/1/15"
```

### 2. Drawer Routes

**Location:** `src/router/drawer/`
**Constants:** `src/constant/drawer-routes.ts`
**Provider:** `DrawerProvider` (`src/providers/drawer-provider/`)

Side panel overlays (full-width on mobile, `lg` on desktop). Used for forms, detail views, and multi-step flows.

```typescript
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useDrawerProvider } from "@/providers/drawer-provider";

const { openDrawer, closeDrawer, isOpen, drawerId, params, state } = useDrawerProvider();

// Open without params
openDrawer(DRAWER_ROUTES.ACCOUNT_CREATE);

// Open with params (encoded in URL)
openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, { accountId: 123, tabId: "details" });

// Open with replace (no new history entry — for tab switching)
openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, { accountId: 123, tabId: "statistic" }, { replace: true });

// Open with state (navigation state, not encoded in URL)
openDrawer(DRAWER_ROUTES.TRANSACTION_CREATE, undefined, {
  state: { payload: { accountId: "5" } },
});

// Close (navigates back)
closeDrawer();
```

### 3. Modal Routes

**Location:** `src/router/modal/`
**Constants:** `src/constant/modal-routes.ts`
**Provider:** `ModalProvider` (`src/providers/modal-provider/`)

Centered dialog overlays. Used for confirmations and destructive actions.

```typescript
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { useModalProvider } from "@/providers/modal-provider";

const { openModal, closeModal, isOpen, modalId, params, state } = useModalProvider();

openModal(MODAL_ROUTES.LOGOUT_CONFIRMATION);
openModal(MODAL_ROUTES.ACCOUNT_DELETE_CONFIRMATION, undefined, {
  state: { accountId: 123 },
});
closeModal();
```

### 4. Bottom Sheet Routes

**Location:** `src/router/bottom-sheet/`
**Constants:** `src/constant/bottom-sheet-routes.ts`
**Provider:** `BottomSheetProvider` (`src/providers/bottom-sheet-provider/`)

Mobile-style sheets that slide up from the bottom. Used for mobile menus and quick actions.

```typescript
import { BOTTOM_SHEET_ROUTES } from "@/constant/bottom-sheet-routes";
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";

const { openBottomSheet, closeBottomSheet } = useBottomSheetProvider();
openBottomSheet(BOTTOM_SHEET_ROUTES.MENU);
closeBottomSheet();
```

## URL-Based Overlay State

Drawer, modal, and bottom sheet state is stored in URL search parameters, making overlays **bookmarkable and shareable**.

### URL Format

```
?drawer=DRAWER_ID                              # No params
?drawer=DRAWER_ID~base64EncodedParams          # With params
```

**Example:**

```
/settings/accounts?drawer=account-view~eyJhY2NvdW50SWQiOjEyMywidGFiSWQiOiJkZXRhaWxzIn0=
```

Decodes to: `drawerId: "account-view"`, `params: { accountId: 123, tabId: "details" }`

### Encoding/Decoding

Handled by helpers in `src/providers/drawer-provider/helpers.ts`:

- `formatDrawerForUrl(drawerId, params)` → `"account-view~base64(...)"`
- `parseDrawerFromUrl(urlString)` → `{ drawerId, params }`

Params are encoded with `btoa(JSON.stringify(params))` and decoded with `JSON.parse(atob(encoded))`.

### Params vs State

| Feature | `params` | `state` (via `opts.state`) |
|---------|----------|---------------------------|
| Stored in | URL search params (base64) | Navigation state (React Router) |
| Persists on refresh | Yes | No |
| Shareable/bookmarkable | Yes | No |
| Use for | IDs, tab selection, filters | Temporary form data, return-to info |

## Page Route Configuration

### Route Registration

All page routes are defined in `src/router/page/page-router.tsx` using `createBrowserRouter`:

```typescript
const router = createBrowserRouter([
  {
    element: <SessionProvider><AuthProvider>...</AuthProvider></SessionProvider>,
    children: [
      { element: <UnprotectedRoute />, children: [/* login */] },
      { element: <ProtectedRoute />, children: [/* app routes */] },
    ],
  },
]);
```

### Lazy Loading

All page components use `React.lazy()` for code splitting:

```typescript
{
  path: PAGE_ROUTES.DASHBOARD,
  Component: lazy(() => import("./dashboard-page")),
}
```

### Nested Routes

Insights and settings use nested routing with `<Outlet />`:

```typescript
{
  path: PAGE_ROUTES.INSIGHTS,
  Component: lazy(() => import("./insights-page")),    // Parent layout
  children: [
    { index: true, Component: lazy(() => import("./insights-overview-page")) },
    { path: "accounts", Component: lazy(() => import("./insights-accounts-page")) },
    { path: "categories", Component: lazy(() => import("./insights-categories-page")) },
  ],
}
```

The parent (`insights-page`) renders shared UI (tabs, header, filters) and an `<Outlet />` for the active child.

### Route Handles (Floating Action Buttons)

Pages declare their FABs via the `handle` property:

```typescript
{
  path: PAGE_ROUTES.DASHBOARD,
  Component: lazy(() => import("./dashboard-page")),
  handle: {
    floatingActionButton: [
      {
        label: "New Transaction",
        link: DRAWER_ROUTES.TRANSACTION_CREATE,
        type: PAGE_HANDLES.DRAWER,
      },
    ],
  },
}
```

The `FloatingActions` component reads the current route's handle and renders the configured buttons. See `src/router/floating-actions/` for implementation.

## Drawer Router

The `DrawerRouter` in `src/router/drawer/drawer-router.tsx` conditionally renders drawer components based on `drawerId`:

```typescript
export const DrawerRouter = () => {
  const { isOpen, drawerId, params, state, closeDrawer } = useDrawerProvider<
    DrawerParams, DrawerState
  >();

  const is = (id: string) => drawerId === id;
  const hasParam = (param: keyof DrawerParams) =>
    params && typeof params === "object" ? param in params : false;

  return (
    <Drawer isOpen={isOpen} onClose={closeDrawer} size={isDesktop ? "lg" : "full"}>
      {is(DRAWER_ROUTES.ACCOUNT_CREATE) && <AccountCreateDrawer />}
      {is(DRAWER_ROUTES.ACCOUNT_VIEW) && hasParam("accountId") && (
        <AccountViewDrawer accountId={params.accountId!} tabId={params.tabId} />
      )}
      {/* ... more routes */}
    </Drawer>
  );
};
```

**Key patterns:**
- `is()` checks the current drawer ID
- `hasParam()` guards against missing required params
- `state` passes ephemeral navigation data (form payloads, return-to info)

## Protected Routes

```typescript
// Redirects to login if not authenticated
export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthProvider();
  if (!isAuthenticated) return <Navigate to={PAGE_ROUTES.LOGIN} replace />;
  return <Outlet />;
};

// Redirects to dashboard if already authenticated
export const UnprotectedRoute = () => {
  const { isAuthenticated } = useAuthProvider();
  if (isAuthenticated) return <Navigate to={PAGE_ROUTES.DASHBOARD} replace />;
  return <Outlet />;
};
```

## Navigation Patterns

### Cross-Layer Navigation

```typescript
// From a page, open a drawer
const { openDrawer } = useDrawerProvider();
openDrawer(DRAWER_ROUTES.TRANSACTION_CREATE);

// From a drawer, open a modal (for delete confirmation)
const { openModal } = useModalProvider();
openModal(MODAL_ROUTES.ACCOUNT_DELETE_CONFIRMATION, undefined, {
  state: { accountId: 123 },
});
```

### Tab Navigation Within Drawers

Use `replace: true` to switch tabs without adding history entries:

```typescript
const { openDrawer } = useDrawerProvider();

const handleTabChange = (tabId: string) => {
  openDrawer(
    DRAWER_ROUTES.ACCOUNT_VIEW,
    { accountId, tabId },
    { replace: true }
  );
};
```

### Selector Drawers (Return-To Pattern)

Some drawers open sub-drawers for selection and return to the original:

```typescript
// From transaction-create, open account selector
openDrawer(DRAWER_ROUTES.SELECT_SINGLE_ACCOUNT, { payloadId: "accountId" }, {
  state: {
    payload: currentFormData,
    returnToDrawer: DRAWER_ROUTES.TRANSACTION_CREATE,
    returnToDrawerId: null,
  },
});
```

## Best Practices

### When to Use Each Layer

| Layer            | Use For                                 | Don't Use For          |
| ---------------- | --------------------------------------- | ---------------------- |
| **Page**         | Main navigation, dashboard, settings    | Forms, temporary views |
| **Drawer**       | Forms, detailed views, multi-step flows | Simple confirmations   |
| **Modal**        | Confirmations, alerts, short forms      | Long forms, navigation |
| **Bottom Sheet** | Mobile menus, quick picks               | Desktop-only features  |

### Naming Conventions

```typescript
// Route constants
DRAWER_ROUTES.ENTITY_ACTION       // ACCOUNT_CREATE, TRANSACTION_VIEW
MODAL_ROUTES.ACTION_CONFIRMATION  // ACCOUNT_DELETE_CONFIRMATION
BOTTOM_SHEET_ROUTES.FEATURE       // MENU

// Component files (kebab-case directories)
account-create-drawer/            → export const AccountCreateDrawer
account-delete-confirmation-modal/ → export const AccountDeleteConfirmationModal
menu-bottom-sheet/                → export const MenuBottomSheet
```

### Route Organization

```
src/router/
├── page/
│   ├── page-router.tsx           # Router config + route guards
│   ├── dashboard-page/
│   ├── transactions-page/
│   ├── insights-page/            # Parent layout with <Outlet />
│   ├── insights-overview-page/   # Child route
│   ├── insights-accounts-page/   # Child route
│   ├── insights-categories-page/ # Child route
│   ├── settings-page/
│   └── settings-*-page/
├── drawer/
│   ├── drawer-router.tsx         # Conditional rendering based on drawerId
│   ├── account-create-drawer/
│   ├── account-view-drawer/      # Tabbed drawer (details/history/statistic)
│   │   ├── index.ts
│   │   ├── account-view-drawer.tsx
│   │   └── components/           # Tab content components
│   └── ...
├── modal/
│   ├── modal-router.tsx
│   └── *-confirmation-modal/
├── bottom-sheet/
│   ├── bottom-sheet-router.tsx
│   └── menu-bottom-sheet/
└── floating-actions/
    ├── floating-actions.tsx       # Reads route handle for FAB config
    ├── handler.ts
    └── types.ts
```
