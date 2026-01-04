# Code Conventions

Guidelines for file structure, naming, and code organization in Spenicle Web.

## File Naming

### Components

```
kebab-case for file names
PascalCase for component names

✅ account-card.tsx           → export const AccountCard
✅ transaction-list.tsx       → export const TransactionList
✅ create-account-drawer.tsx  → export const CreateAccountDrawer
✅ delete-confirmation-modal.tsx → export const DeleteConfirmationModal
✅ app-layout.tsx             → export const AppLayout

❌ AccountCard.tsx (file should be kebab-case)
❌ account_card.tsx (use kebab-case, not snake_case)
❌ accountCard.tsx (use kebab-case, not camelCase)
```

### Hooks

```
kebab-case + "use-" prefix

✅ use-session.ts
✅ use-debounced-state.ts
✅ use-api.ts

❌ useSession.ts
❌ session-hook.ts
❌ UseSession.ts
```

### Utils/Libs

```
kebab-case + descriptive name

✅ format-date.ts
✅ format-price.ts
✅ name-to-initial.ts

❌ formatDate.ts
❌ FormatDate.ts
```

### Constants

```
kebab-case + descriptive name

✅ page-routes.ts
✅ drawer-routes.ts
✅ page-handles.ts

❌ PAGE_ROUTES.ts
❌ pageRoutes.ts
```

### Types

```
PascalCase + "Type" or "Interface" suffix (implicit)

✅ types/schemas.ts
✅ AuthLoginRequest
✅ AccountListResponse

❌ types.ts
❌ IAccount
❌ TAccount
```

## Folder Structure

### Flat vs Nested

```
✅ Flat for simple components
src/components/
  app-layout.tsx
  page-loader.tsx

✅ Nested for complex features
src/components/
  floating-actions/
    index.ts              ← Barrel export
    floating-actions.tsx  ← Main component
    handler.ts            ← Logic
    types.ts              ← Types

❌ Don't over-nest
src/components/
  floating-actions/
    components/           ← Unnecessary
      floating-actions.tsx
```

### Feature Folders

Group related files by feature:

```
src/router/drawer/
  drawer-router.tsx           # Router config
  account-create-drawer/      # Feature folder
    index.ts                  # Barrel export
    account-create-drawer.tsx # actual file (exports CreateAccountDrawer)
    form.tsx                  # Sub-component
    validation.ts             # Feature-specific logic
    types.ts                  # Feature-specific types
  category-create-drawer/
    index.tsx
    ...
```

### Barrel Exports

Always include `index.ts` for clean imports:

```typescript
// index.ts
export { FloatingActions } from "./floating-actions";
export { useFloatingActionHandler } from "./handler";
export type { FloatingActionItem } from "./types";

// Usage
import {
  FloatingActions,
  useFloatingActionHandler,
} from "@/components/floating-actions";
```

## Import Organization

```typescript
// 1. External dependencies
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

// 2. Internal absolute imports (@/)
import { useAuthProvider } from "@/providers/auth-provider";
import { PAGE_ROUTES } from "@/constant/page-routes";
import { formatDate } from "@/lib/format-date";

// 3. Relative imports
import { helper } from "./helper";
import type { LocalType } from "./types";

// 4. Styles (if any)
import "./styles.css";
```

## Component Structure

```typescript
// 1. Types/Interfaces
interface ComponentProps {
  title: string;
  onClose: () => void;
}

// 2. Component
export const Component = ({ title, onClose }: ComponentProps) => {
  // 2a. Hooks (grouped by type)
  const navigate = useNavigate();
  const { user } = useAuthProvider();

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<Data | null>(null);

  // 2b. Derived state
  const isValid = useMemo(() => validate(data), [data]);

  // 2c. Effects
  useEffect(() => {
    // ...
  }, []);

  // 2d. Event handlers
  const handleSubmit = async () => {
    // ...
  };

  // 2e. Conditional renders
  if (isLoading) return <Loader />;
  if (!data) return null;

  // 2f. Main render
  return <div>{/* JSX */}</div>;
};

// 3. Helper components (if small and local)
const SubComponent = () => {
  return <div>...</div>;
};
```

## Naming Conventions

### Variables

```typescript
// ✅ Descriptive camelCase
const accountList = getAccounts();
const isAuthenticated = checkAuth();
const handleSubmit = () => {};

// ❌ Abbreviations (unless common)
const accList = getAccounts();
const isAuth = checkAuth();
```

### Constants

```typescript
// ✅ SCREAMING_SNAKE_CASE for true constants
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const API_BASE_URL = "https://api.example.com";

// ✅ PascalCase for constant objects
export const PAGE_ROUTES = {
  DASHBOARD: "/dashboard",
  SETTINGS: "/settings",
} as const;

export const DateFormat = {
  SHORT_DATE: "shortDate",
  LONG_DATE: "longDate",
} as const;
```

### Functions

```typescript
// ✅ Verb + noun (actions)
const fetchAccounts = () => {};
const createTransaction = () => {};
const handleClick = () => {};

// ✅ is/has/should prefix (booleans)
const isValid = checkValid();
const hasPermission = checkPermission();
const shouldRender = checkCondition();

// ❌ Unclear intent
const accounts = () => {}; // Is this fetching? Getting?
const validate = () => {}; // Returns boolean or throws?
```

### Event Handlers

```typescript
// ✅ handle + Event
const handleClick = () => {};
const handleSubmit = () => {};
const handleChange = (value: string) => {};

// ✅ on + Event (for props)
interface Props {
  onClick: () => void;
  onSubmit: () => void;
  onChange: (value: string) => void;
}
```

## TypeScript

### Prefer Type Inference

```typescript
// ✅ Let TypeScript infer
const [count, setCount] = useState(0);
const navigate = useNavigate();

// ❌ Unnecessary annotations
const [count, setCount] = useState<number>(0);
const navigate: NavigateFunction = useNavigate();
```

### Explicit When Needed

```typescript
// ✅ Complex types
const [data, setData] = useState<Account | null>(null);
const [filters, setFilters] = useState<FilterState>({
  category: null,
  dateRange: null,
});

// ✅ Function parameters
const handleUpdate = (id: string, data: Partial<Account>) => {};

// ✅ Return types for exported functions
export const formatAccount = (account: Account): FormattedAccount => {
  // ...
};
```

### Avoid `any`

```typescript
// ❌ Never use any
const data: any = fetchData();

// ✅ Use unknown and narrow
const data: unknown = fetchData();
if (isAccount(data)) {
  // TypeScript knows data is Account here
}

// ✅ Use generic types
const fetchData = <T>(): T => {
  // ...
};
```

## Comments

### When to Comment

```typescript
// ✅ Complex business logic
// Calculate pro-rated amount for partial month subscription
const proratedAmount = (baseAmount * daysUsed) / totalDaysInMonth;

// ✅ Non-obvious workarounds
// Safari requires explicit width on flex children
// See: https://bugs.webkit.org/show_bug.cgi?id=XXXXX
<div style={{ width: '100%' }}>

// ✅ TODOs with context
// TODO(username): Refactor after API v2 migration
// TODO: Add error boundary once design is finalized

// ❌ Obvious comments
// Set loading to true
setIsLoading(true);

// ❌ Commented-out code (use git history instead)
// const oldFunction = () => {
//   // ...
// };
```

### JSDoc for Exported Functions

```typescript
/**
 * Format a price with currency symbol and locale formatting
 * @param value - The numeric value to format
 * @param format - The format type to use (default: CURRENCY)
 * @param options - Optional configuration (currency defaults to IDR)
 * @returns Formatted price string
 * @example
 * formatPrice(1234.56, PriceFormat.CURRENCY) // "Rp1.234,56"
 */
export function formatPrice(
  value: number,
  format: PriceFormatType = PriceFormat.CURRENCY,
  options: FormatPriceOptions = {}
): string {
  // ...
}
```

## Code Organization

### Separation of Concerns

```typescript
// ❌ Mixing concerns
const AccountList = () => {
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then(setAccounts);
  }, []);

  return <div>{/* render */}</div>;
};

// ✅ Separated concerns
const AccountList = () => {
  const { data: accounts } = useGetAccounts(); // Hook handles API
  return <div>{/* render */}</div>;
};
```

### Extract Complex Logic

```typescript
// ❌ Complex logic in component
const Component = () => {
  const isValid =
    data.amount > 0 &&
    data.category &&
    data.date &&
    (data.type === "income" || data.account) &&
    (!data.tags || data.tags.length <= 5);

  // ...
};

// ✅ Extract to function
const validateTransaction = (data: Transaction): boolean => {
  return (
    data.amount > 0 &&
    data.category &&
    data.date &&
    (data.type === "income" || data.account) &&
    (!data.tags || data.tags.length <= 5)
  );
};

const Component = () => {
  const isValid = validateTransaction(data);
  // ...
};
```

## Performance

### Memoization

```typescript
// ✅ Memoize expensive computations
const sortedAccounts = useMemo(() => {
  return accounts.sort((a, b) => b.balance - a.balance);
}, [accounts]);

// ✅ Memoize callbacks passed to children
const handleUpdate = useCallback(
  (id: string) => {
    updateAccount(id);
  },
  [updateAccount]
);

// ❌ Don't over-optimize
const sum = useMemo(() => a + b, [a, b]); // Not worth it
```

### Lazy Loading

```typescript
// ✅ Lazy load routes
const DashboardPage = lazy(() => import("./dashboard-page"));

// ✅ Lazy load heavy components
const Chart = lazy(() => import("./chart"));

// Usage with Suspense
<Suspense fallback={<Loader />}>
  <Chart data={data} />
</Suspense>;
```

## Testing

```typescript
// Component.test.tsx
describe("Component", () => {
  it("renders correctly", () => {
    render(<Component />);
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("handles user interaction", async () => {
    const handleClick = vi.fn();
    render(<Component onClick={handleClick} />);

    await userEvent.click(screen.getByRole("button"));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Examples

See existing code for reference:

- Components: `src/components/floating-actions/`
- Hooks: `src/hooks/use-session/`
- Utils: `src/lib/format-date/`
- Providers: `src/providers/auth-provider/`
- Routes: `src/router/page/page-router.tsx`
