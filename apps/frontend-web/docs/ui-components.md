# UI Components

Reusable, presentational components in `src/ui/` that display data models with consistent patterns.

## Overview

The `src/ui/` directory contains domain-specific UI components organized into three categories:

| Category | Pattern | Examples |
|----------|---------|---------|
| **Cards** | Display a model item in a list | `AccountCard`, `TransactionCard`, `CategoryCard` |
| **Filter Fields** | Filter controls connected to a filter hook | `AccountFilterFields`, `TransactionFilterFields` |
| **Statistics** | Display a single statistic data model | `AccountsStatisticBurnRate`, `CategoryStatisticSpendingVelocity` |

### Component Locations

```
src/
├── ui/                      # Domain-specific, reusable components
│   ├── account-card/
│   ├── category-card/
│   ├── transaction-card/
│   ├── transaction-template-card/
│   ├── account-filter-fields/
│   ├── category-filter-fields/
│   ├── transaction-filter-fields/
│   ├── transaction-template-filter-fields/
│   ├── accounts-statistic-budget-health/
│   ├── accounts-statistic-burn-rate/
│   ├── accounts-statistic-cash-flow-pulse/
│   ├── accounts-statistic-category-heatmap/
│   ├── accounts-statistic-monthly-velocity/
│   ├── accounts-statistic-time-frequency/
│   ├── category-statistic-account-distribution/
│   ├── category-statistic-average-transaction-size/
│   ├── category-statistic-budget-utilization/
│   ├── category-statistic-day-of-week-pattern/
│   └── category-statistic-spending-velocity/
├── components/              # App-wide layout components (AppLayout, etc.)
└── router/                  # Page/drawer/modal components (contain business logic)
```

**Distinction:**
- `src/ui/` — Presentational. Receive data via props. No routing or API calls.
- `src/components/` — App-wide structural components (layout, navigation).
- `src/router/` — Feature components with business logic, API calls, and routing.

## Card Components

Card components display a data model as a list item using the Versaur `Card` component.

### Pattern

```typescript
import { formatAccountData } from "@/lib/format-data";
import { When } from "@/lib/when";
import type { AccountModel } from "@/types/schemas";
import { Avatar, Badge, BadgeGroup, Card, type CardProps } from "@dimasbaguspm/versaur";

interface AccountCardProps extends Omit<CardProps, "onClick"> {
  account: AccountModel;
  onClick?: (account: AccountModel) => void;
  hideType?: boolean;
  hideGroup?: boolean;
  hideAmount?: boolean;
}

export const AccountCard: FC<AccountCardProps> = (props) => {
  const { account, onClick, hideGroup, hideAmount, hideType, ...rest } = props;
  const { formattedAmount, name, initialName, type, variant, hasBudget, budgetIntent, budgetText } =
    formatAccountData(account);

  return (
    <Card
      onClick={() => onClick?.(account)}
      avatar={<Avatar shape="rounded">{initialName}</Avatar>}
      title={name}
      badge={
        <BadgeGroup>
          <When condition={!hideType}><Badge color={variant}>{type}</Badge></When>
          <When condition={hasBudget}><Badge color={budgetIntent}>{budgetText}</Badge></When>
        </BadgeGroup>
      }
      supplementaryInfo={hideAmount ? undefined : formattedAmount}
      {...rest}
    />
  );
};
```

### Key Conventions

1. **Extend `CardProps`** — Spread remaining props to `Card` for flexibility
2. **Use `formatData()` utilities** — Transform raw model into display-ready values (`formatAccountData`, `formatTransactionData`, `formatCategoryData` from `src/lib/format-data/`)
3. **Conditional visibility** — `hide*` boolean props control optional sections
4. **`When` component** — Used for conditional rendering of badges and sections
5. **`onClick` receives the full model** — Not just an ID

### Available Cards

| Component | Model | Format Utility |
|-----------|-------|---------------|
| `AccountCard` | `AccountModel` | `formatAccountData()` |
| `CategoryCard` | `CategoryModel` | `formatCategoryData()` |
| `TransactionCard` | `TransactionModel` | `formatTransactionData()` |
| `TransactionTemplateCard` | `TransactionTemplateModel` | `formatTransactionTemplateData()` |

## Filter Field Components

Filter field components provide UI controls for filter hooks. They accept a `control` prop matching the return type of their corresponding filter hook.

### Pattern

```typescript
import type { useTransactionFilter } from "@/hooks/use-filter-state";
import { When } from "@/lib/when";
import { ButtonMenu, FormLayout } from "@dimasbaguspm/versaur";

interface TransactionFilterFieldsProps {
  control: ReturnType<typeof useTransactionFilter>;
  hideType?: boolean;
  hideDateRange?: boolean;
}

export const TransactionFilterFields = ({ control, hideType, hideDateRange }: TransactionFilterFieldsProps) => {
  const handleOnTypeFilterClick = (name: string) => {
    const currentTypes = control.getAll("type");
    if (currentTypes.includes(name)) {
      control.removeSingle("type", name);
    } else {
      control.replaceSingle("type", name);
    }
  };

  return (
    <FormLayout>
      <When condition={!hideType}>
        <ButtonMenu label="Type">
          <ButtonMenu.Item
            onClick={() => handleOnTypeFilterClick("expense")}
            active={control.getAll("type")?.includes("expense")}
          >
            Expense
          </ButtonMenu.Item>
          {/* ... more items */}
        </ButtonMenu>
      </When>
      <When condition={!hideDateRange}>
        {/* Date inputs with showPicker() for mobile */}
      </When>
    </FormLayout>
  );
};
```

### Key Conventions

1. **`control` prop** — Typed as `ReturnType<typeof useXFilter>` for type safety
2. **`hide*` props** — Allow consumers to hide specific filter sections
3. **`ButtonMenu`** — Used for multi-select toggle filters (type, status)
4. **Date inputs** — Hidden `<input type="date">` with `showPicker()` API for mobile-friendly date selection
5. **Toggle logic** — If value is already selected, remove it; otherwise, set it

### Available Filter Fields

| Component | Filter Hook | Controls |
|-----------|------------|----------|
| `AccountFilterFields` | `useAccountFilter` | Type, archived status |
| `CategoryFilterFields` | `useCategoryFilter` | Type |
| `TransactionFilterFields` | `useTransactionFilter` | Type, date range |
| `TransactionTemplateFilterFields` | `useTransactionTemplateFilter` | Type, frequency |

### Integration Example

```typescript
import { useTransactionFilter } from "@/hooks/use-filter-state";
import { TransactionFilterFields } from "@/ui/transaction-filter-fields";

const TransactionsPage = () => {
  const filters = useTransactionFilter();

  return (
    <>
      <TransactionFilterFields control={filters} />
      <TransactionList params={filters.appliedFilters} />
    </>
  );
};
```

## Statistic Components

Statistic components display a single statistics data model, typically rendered inside view drawer statistic tabs.

### Pattern

```typescript
import type { AccountStatisticBurnRateModel } from "@/types/schemas";
import { formatPrice, PriceFormat } from "@/lib/format-price";
import { Text } from "@dimasbaguspm/versaur";

interface AccountsStatisticBurnRateProps {
  data: AccountStatisticBurnRateModel;
}

export const AccountsStatisticBurnRate: FC<AccountsStatisticBurnRateProps> = ({ data }) => {
  const hasData = data && (data.dailyAverageSpend || data.weeklyAverageSpend || data.monthlyAverageSpend);

  return (
    <div>
      <Text as="strong" className="mb-2 block font-semibold text-sm">
        Burn Rate Averages
      </Text>
      {hasData ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Text as="p" transform="uppercase" className="text-xs">Daily</Text>
            <Text as="p" className="font-semibold">
              {formatPrice(data.dailyAverageSpend, PriceFormat.COMPACT_CURRENCY)}
            </Text>
          </div>
          {/* Weekly, Monthly... */}
        </div>
      ) : (
        <Text as="p">No data available</Text>
      )}
    </div>
  );
};
```

### Key Conventions

1. **Single `data` prop** — Receives one typed model from the backend
2. **Empty state handling** — Always check for data presence and show a fallback
3. **Format utilities** — Use `formatPrice`, `formatDate` for display values
4. **Recharts** — Used for chart-based statistics (area charts, bar charts)
5. **Tailwind grid** — Layout with `grid grid-cols-*` for metric grids
6. **Versaur `Text`** — Used for all text rendering with consistent typography

### Available Statistics

**Account Statistics** (used in account view drawer, statistic tab):

| Component | Model | Visualization |
|-----------|-------|--------------|
| `AccountsStatisticBudgetHealth` | `AccountStatisticBudgetHealthModel` | Metric cards |
| `AccountsStatisticBurnRate` | `AccountStatisticBurnRateModel` | Daily/weekly/monthly grid |
| `AccountsStatisticCashFlowPulse` | `AccountStatisticCashFlowPulseModel` | Area chart |
| `AccountsStatisticCategoryHeatmap` | `AccountStatisticCategoryHeatmapModel` | Heatmap grid |
| `AccountsStatisticMonthlyVelocity` | `AccountStatisticMonthlyVelocityModel` | Area chart |
| `AccountsStatisticTimeFrequency` | `AccountStatisticTimeFrequencyModel` | Time-based heatmap |

**Category Statistics** (used in category view drawer, statistic tab):

| Component | Model | Visualization |
|-----------|-------|--------------|
| `CategoryStatisticAccountDistribution` | `CategoryStatisticAccountDistributionModel` | Distribution chart |
| `CategoryStatisticAverageTransactionSize` | `CategoryStatisticAverageTransactionSizeModel` | Metric cards |
| `CategoryStatisticBudgetUtilization` | `CategoryStatisticBudgetUtilizationModel` | Utilization metric |
| `CategoryStatisticDayOfWeekPattern` | `CategoryStatisticDayOfWeekPatternModel` | Day pattern chart |
| `CategoryStatisticSpendingVelocity` | `CategoryStatisticSpendingVelocityModel` | Velocity chart |

## Adding a New UI Component

1. **Create directory** in `src/ui/{component-name}/`
2. **Create component file** `{component-name}.tsx` with the appropriate pattern (card/filter/statistic)
3. **Create barrel export** `index.ts`:

```typescript
export { MyComponent } from "./my-component";
```

4. **Follow conventions:**
   - Accept a typed model or control as the main prop
   - Use `When` for conditional rendering
   - Use format utilities for display values
   - Handle empty/loading states
   - Use Versaur components (`Card`, `Text`, `Badge`, `FormLayout`, etc.)
