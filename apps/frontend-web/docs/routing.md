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
│  │  │  │ Bottom Sheet     │  │  │   │  Mobile sheets
│  │  │  │   (Layer 3)      │  │  │   │
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
- Drawer opens → Transaction form (in overlay, URL stays `/dashboard`)
- Benefits: Context preserved, clean history, intuitive back behavior

## Layer Definitions

### 1. Page Routes

**Location:** `src/router/page/`  
**Constants:** `src/constant/page-routes.ts`  
**Provider:** React Router (native)

Full-page navigation. Changes the main content area.

```typescript
import { PAGE_ROUTES } from "@/constant/page-routes";
import { useNavigate } from "react-router";

const navigate = useNavigate();
navigate(PAGE_ROUTES.DASHBOARD);
navigate(PAGE_ROUTES.SETTINGS_ACCOUNTS);
```

### 2. Drawer Routes

**Location:** `src/router/drawer/`  
**Constants:** `src/constant/drawer-routes.ts`  
**Provider:** `DrawerProvider`

Side panel overlays (typically slide from right). Used for forms, detail views, and secondary actions.

```typescript
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { useDrawerProvider } from "@/providers/drawer-provider";

const { open, close } = useDrawerProvider();
open(DRAWER_ROUTES.ACCOUNT_CREATE);
open(DRAWER_ROUTES.TRANSACTION_VIEW, { id: "123" }); // with params
close();
```

### 3. Modal Routes

**Location:** `src/router/modal/`  
**Constants:** `src/constant/modal-routes.ts`  
**Provider:** `ModalProvider`

Centered dialog overlays. Used for confirmations, alerts, and short interactions.

```typescript
import { MODAL_ROUTES } from "@/constant/modal-routes";
import { useModalProvider } from "@/providers/modal-provider";

const { open, close } = useModalProvider();
open(MODAL_ROUTES.LOGOUT_CONFIRMATION);
close();
```

### 4. Bottom Sheet Routes

**Location:** `src/router/bottom-sheet/`  
**Constants:** `src/constant/bottom-sheet-routes.ts`  
**Provider:** `BottomSheetProvider`

Mobile-style sheets that slide up from bottom. Used for quick actions and selections.

```typescript
import { BOTTOM_SHEET_ROUTES } from "@/constant/bottom-sheet-routes";
import { useBottomSheetProvider } from "@/providers/bottom-sheet-provider";

const { open, close } = useBottomSheetProvider();
open(BOTTOM_SHEET_ROUTES.MENU);
close();
```

## Route Configuration

### Page Route Example

```typescript
// src/router/page/page-router.tsx
{
  path: PAGE_ROUTES.DASHBOARD,
  handle: {
    floatingActionButton: [
      {
        label: 'Add Transaction',
        link: DRAWER_ROUTES.TRANSACTION_CREATE,
        type: PAGE_HANDLES.DRAWER,
      },
    ],
  },
  Component: lazy(() => import('./dashboard-page')),
}
```

### Drawer Route Example

```typescript
// src/router/drawer/drawer-router.tsx
export const DrawerRouter = () => {
  const { currentRoute, params, close } = useDrawerProvider();

  switch (currentRoute) {
    case DRAWER_ROUTES.ACCOUNT_CREATE:
      return <AccountCreateDrawer onClose={close} />;

    case DRAWER_ROUTES.ACCOUNT_VIEW:
      return <AccountViewDrawer id={params?.id} onClose={close} />;

    default:
      return null;
  }
};
```

## Route Handles

Pages can declare metadata in the `handle` property:

```typescript
{
  path: PAGE_ROUTES.DASHBOARD,
  handle: {
    // Floating action buttons
    floatingActionButton: [
      {
        label: 'Quick Action',
        link: DRAWER_ROUTES.SOME_DRAWER,
        type: PAGE_HANDLES.DRAWER,
      },
    ],

    // Future: breadcrumbs, page title, permissions, etc.
  },
  Component: DashboardPage,
}
```

Currently used for:

- **Floating Action Buttons** - Dynamic FAB configuration

See `/components/floating-actions/` for implementation.

## Navigation Patterns

### Cross-Layer Navigation

```typescript
// From a page, open a drawer
const { open: openDrawer } = useDrawerProvider();
openDrawer(DRAWER_ROUTES.TRANSACTION_CREATE);

// From a drawer, open a modal
const { open: openModal } = useModalProvider();
openModal(MODAL_ROUTES.DELETE_CONFIRMATION);

// From a modal, close and trigger drawer action
const { close: closeModal } = useModalProvider();
const { open: openDrawer } = useDrawerProvider();

closeModal();
openDrawer(DRAWER_ROUTES.NEXT_STEP);
```

### Passing Parameters

```typescript
// Open with params
openDrawer(DRAWER_ROUTES.ACCOUNT_VIEW, { id: "123", mode: "edit" });

// Access in component
const { params } = useDrawerProvider();
const accountId = params?.id;
```

### Programmatic Close

```typescript
// Close drawer after success
const { close } = useDrawerProvider();
const mutation = useCreateAccount({
  onSuccess: () => {
    toast.success("Account created");
    close();
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
// Routes
PAGE_ROUTES.FEATURE_NAME;
DRAWER_ROUTES.ENTITY_ACTION; // ACCOUNT_CREATE
MODAL_ROUTES.ACTION_SUBJECT; // DELETE_CONFIRMATION
BOTTOM_SHEET_ROUTES.FEATURE; // MENU

// Component files (kebab-case)
feature-name-page.tsx            → export const FeatureNamePage
entity-action-drawer.tsx         → export const EntityActionDrawer
action-subject-modal.tsx         → export const ActionSubjectModal
feature-bottom-sheet.tsx         → export const FeatureBottomSheet
```

### Route Organization

```
src/router/
├── page/
│   ├── page-router.tsx        # Router config
│   ├── dashboard-page.tsx     # Collocated page components
│   └── settings-page.tsx
├── drawer/
│   ├── drawer-router.tsx
│   └── account-create-drawer/ # Folder per drawer (if complex)
│       ├── index.tsx
│       └── form.tsx
├── modal/
│   └── modal-router.tsx
└── bottom-sheet/
    └── bottom-sheet-router.tsx
```

## Protected Routes

```typescript
// Wrap protected pages
{
  element: <ProtectedRoute />,
  children: [
    {
      path: PAGE_ROUTES.DASHBOARD,
      Component: DashboardPage,
    },
  ],
}

// Unprotected (login, etc.)
{
  element: <UnprotectedRoute />,
  children: [
    {
      path: PAGE_ROUTES.LOGIN,
      Component: LoginPage,
    },
  ],
}
```

See `src/router/page/page-router.tsx` for implementation.

## Future Enhancements

Planned features:

- Breadcrumb generation from route handles
- Page title management
- Permission-based route guards
- Analytics tracking per layer
- Deep linking support for drawers/modals
