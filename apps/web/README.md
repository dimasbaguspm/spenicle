# Spenicle Web

Web frontend for Spenicle personal finance management system.

## Tech Stack

- **Runtime:** Bun
- **Framework:** React 19 + TypeScript
- **Routing:** React Router v7
- **Styling:** Tailwind CSS + shadcn/ui
- **API:** OpenAPI-generated types + TanStack Query
- **State Management:** React Context + Custom Providers
- **Build Tool:** Vite (via Bun)

## Project Structure

```
apps/web/
├── cmd/                       # Entry points
│   └── dev.ts                # Development server
├── scripts/                   # Build scripts
│   └── generate-openapi-types.ts
├── src/
│   ├── components/           # Reusable components
│   │   ├── app-layout/      # Main app shell
│   │   └── floating-actions/ # FAB system
│   ├── constant/            # App constants
│   │   ├── page-routes.ts   # Page route paths
│   │   ├── drawer-routes.ts # Drawer route paths
│   │   ├── modal-routes.ts  # Modal route paths
│   │   └── page-handles.ts  # Route handle types
│   ├── hooks/               # Custom React hooks
│   │   ├── use-api/        # API query hooks
│   │   ├── use-session/    # Session management
│   │   └── use-*-state/    # State utilities
│   ├── lib/                # Pure utility functions
│   │   ├── format-date/    # Date formatting
│   │   ├── format-price/   # Price formatting
│   │   └── format-data/    # Data transformers
│   ├── providers/          # React Context providers
│   │   ├── auth-provider/
│   │   ├── session-provider/
│   │   ├── drawer-provider/
│   │   ├── modal-provider/
│   │   └── bottom-sheet-provider/
│   ├── router/             # Routing configuration
│   │   ├── page/          # Main page routes
│   │   ├── drawer/        # Drawer overlays
│   │   ├── modal/         # Modal dialogs
│   │   └── bottom-sheet/  # Bottom sheet overlays
│   ├── types/             # TypeScript types
│   │   ├── schemas.ts     # Custom types
│   │   └── generated/     # OpenAPI types
│   └── ui/                # UI components
│       ├── account-card/
│       ├── category-card/
│       └── transaction-card/
```

## Key Concepts

### Multi-Layer Routing

Spenicle Web uses a **4-layer routing system**:

1. **Page Routes** (`/router/page/*`) - Full page views
2. **Drawer Routes** (`/router/drawer/*`) - Side panel overlays
3. **Modal Routes** (`/router/modal/*`) - Dialog overlays
4. **Bottom Sheet Routes** (`/router/bottom-sheet/*`) - Mobile sheets

Each layer has its own:

- Router configuration
- Route constants (in `/constant/`)
- Provider for state management
- Isolated navigation context

**Example:**

```typescript
// Navigate to a page
navigate(PAGE_ROUTES.DASHBOARD);

// Open a drawer
openDrawer(DRAWER_ROUTES.ACCOUNT_CREATE);

// Open a modal
openModal(MODAL_ROUTES.LOGOUT_CONFIRMATION);
```

See [docs/routing.md](docs/routing.md) for details.

### Provider Pattern

All app-level state is managed through React Context providers:

- **SessionProvider** - Token storage (sessionStorage + localStorage)
- **AuthProvider** - Authentication state
- **DrawerProvider** - Drawer overlay management
- **ModalProvider** - Modal dialog management
- **BottomSheetProvider** - Bottom sheet management

See [docs/state-management.md](docs/state-management.md) for details.

### Floating Action Buttons (FAB)

Dynamic floating action buttons configured via route handles:

```typescript
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
  Component: DashboardPage,
}
```

The `<FloatingActions />` component reads the current route's handle and renders appropriate buttons.

### API Layer

API calls are abstracted through custom hooks in `/hooks/use-api/`:

```typescript
// Auto-generated from OpenAPI spec
import { useGetAccounts, useCreateAccount } from "@/hooks/use-api";

const { data: accounts } = useGetAccounts();
const createAccount = useCreateAccount();
```

**Type Safety:** All API types are generated from the backend's OpenAPI spec.

### Format Utilities

Consistent formatting through utility libraries:

```typescript
import { formatDate, DateFormat } from "@/lib/format-date";
import { formatPrice, PriceFormat } from "@/lib/format-price";

formatDate(new Date(), DateFormat.MEDIUM_DATE); // "Jan 4, 2024"
formatPrice(1234.56, PriceFormat.CURRENCY); // "Rp1.234,56"
```

Currency defaults to IDR but is configurable.

## Development

### Getting Started

```bash
cd apps/web

# Install dependencies
bun install

# Generate API types from backend OpenAPI spec
bun run generate:openapi-types

# Start development server
bun run dev
```

### Commands

```bash
bun run dev                     # Start dev server
bun run generate:css            # Generate minified tailwind css for static files
bun run generate:openapi-types  # Generate API types from backend
```

### Adding a New Page

1. Create route constant in `/constant/page-routes.ts`
2. Create page component in `/router/page/`
3. Add route to page router in `/router/page/page-router.tsx`
4. (Optional) Add FAB configuration in route handle

See [docs/conventions.md](docs/conventions.md) for detailed guidelines.

## Documentation

- [Routing System](docs/routing.md) - Multi-layer routing architecture
- [State Management](docs/state-management.md) - Provider patterns
- [Code Conventions](docs/conventions.md) - File structure and naming
- [API Integration](docs/api-integration.md) - Working with the backend

## Architecture Decisions

### Why Multi-Layer Routing?

Traditional SPA routing uses a single layer (pages). We use 4 layers to:

- Maintain context when showing overlays
- Enable complex navigation flows (e.g., drawer within modal)
- Keep URLs clean (overlays don't clutter history)
- Match native mobile UX patterns

### Why sessionStorage for Access Tokens?

- **Security:** Tokens cleared when tab closes
- **UX:** Each new tab requires authentication (or refresh)
- **Refresh tokens:** Persist in localStorage for seamless re-auth

### Why Providers over Global State?

- **Encapsulation:** Each provider owns its domain
- **Type Safety:** Strong TypeScript support
- **Performance:** Only consumers re-render
- **Testing:** Easy to mock individual providers

## Contributing

Follow the patterns established in existing code:

1. Use TypeScript strictly (no `any`)
2. Follow file naming conventions (see [docs/conventions.md](docs/conventions.md))
3. Add types to `/types/schemas.ts` for custom types
4. Keep components small and focused
5. Use custom hooks for logic reuse
