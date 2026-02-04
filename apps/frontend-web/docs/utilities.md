# Utilities

Pure utility functions and helper components in `src/lib/`.

## Directory Structure

```
src/lib/
├── format-price/
│   ├── index.ts
│   └── format-price.ts          # Price/currency formatting (17+ formats)
├── format-date/
│   ├── index.ts
│   └── format-date.ts           # Date formatting (35+ formats)
├── format-data/
│   ├── index.ts
│   ├── format-account-data.ts   # AccountModel → display values
│   ├── format-category-data.ts  # CategoryModel → display values
│   ├── format-transaction-data.ts       # TransactionModel → display values
│   └── format-transaction-template-data.ts  # TransactionTemplateModel → display values
├── name-to-initial/
│   ├── index.ts
│   └── name-to-initial.ts       # Name → initials conversion
└── when/
    ├── index.ts
    └── when.tsx                  # Conditional rendering component
```

## formatPrice

Formats numeric values into display-ready price strings with 17+ format types.

**Location:** `src/lib/format-price/format-price.ts`

### Usage

```typescript
import { formatPrice, PriceFormat } from "@/lib/format-price";

formatPrice(1234.56, PriceFormat.CURRENCY)              // "Rp1.234,56"
formatPrice(1234.56, PriceFormat.CURRENCY_NO_DECIMALS)   // "Rp1.235"
formatPrice(1234567, PriceFormat.COMPACT_CURRENCY)       // "Rp1.2M"
formatPrice(-1234.56, PriceFormat.ACCOUNTING)            // "(Rp1.234,56)"
formatPrice(0.1234, PriceFormat.PERCENTAGE)              // "12.34%"
formatPrice(1234.56, PriceFormat.DECIMAL)                // "1,234.56"
formatPrice(1234.56, PriceFormat.WITH_CODE)              // "1,234.56 IDR"
formatPrice(1234.56, PriceFormat.SIGNED)                 // "+Rp1.234,56"
```

### Format Types

| Format | Output Example | Use Case |
|--------|---------------|----------|
| `CURRENCY` | `Rp1.234,56` | Account balances, transaction amounts |
| `CURRENCY_NO_DECIMALS` | `Rp1.235` | Card supplementary info |
| `COMPACT_CURRENCY` | `Rp1.2K` | Statistics, charts |
| `COMPACT` | `1.2K` | Chart axis labels |
| `ACCOUNTING` | `(Rp1.234,56)` | Negative amounts |
| `DECIMAL` | `1,234.56` | Numeric display without currency |
| `INTEGER` | `1,234` | Counts |
| `PERCENTAGE` | `12.34%` | Ratios, proportions |
| `PERCENTAGE_INTEGER` | `12%` | Simplified percentages |
| `SIGNED` | `+Rp1.234,56` | Gains/losses |
| `WITH_CODE` | `1,234.56 IDR` | International display |
| `CRYPTO_8_DECIMALS` | `0.00123456 BTC` | Crypto values |
| `SCIENTIFIC` | `1.23e+6` | Technical display |

### Options

```typescript
interface FormatPriceOptions {
  currency?: string;   // ISO 4217 code (default: "IDR")
  locale?: string;     // Formatting locale (auto-derived from currency)
}

formatPrice(1234.56, PriceFormat.CURRENCY, { currency: "USD" })  // "$1,234.56"
```

## formatDate

Formats dates into human-readable strings with 35+ format types. Built on dayjs with `relativeTime`, `advancedFormat`, and `localizedFormat` plugins.

**Location:** `src/lib/format-date/format-date.ts`

### Usage

```typescript
import { formatDate, DateFormat } from "@/lib/format-date";

formatDate(new Date(), DateFormat.RELATIVE)           // "2 hours ago"
formatDate(new Date(), DateFormat.FRIENDLY_DATE)      // "Today"
formatDate("2024-01-15", DateFormat.MEDIUM_DATE)      // "Jan 15, 2024"
formatDate("2024-01-15", DateFormat.LONG_DATE)        // "January 15, 2024"
formatDate("2024-01-15T14:30:00Z", DateFormat.TIME_24H) // "14:30"
formatDate("2024-01-15", DateFormat.ISO_DATE)         // "2024-01-15"
formatDate("2024-01-15", DateFormat.ORDINAL_DAY)      // "15th"
```

### Format Types

**Relative/Humanized:**

| Format | Output | Description |
|--------|--------|-------------|
| `RELATIVE` | `2 hours ago` | Relative with suffix |
| `RELATIVE_FROM_NOW` | `2 hours` | Relative without suffix |
| `FRIENDLY_DATE` | `Today` / `Yesterday` / `Jan 15, 2024` | Smart near-date labels |

**Common Readable:**

| Format | Output | Description |
|--------|--------|-------------|
| `FULL_DATE` | `Monday, January 15, 2024` | Full weekday + date |
| `LONG_DATE` | `January 15, 2024` | Full month name |
| `MEDIUM_DATE` | `Jan 15, 2024` | Abbreviated month |
| `SHORT_DATE` | `01/15/2024` | Numeric |
| `COMPACT_DATE` | `1/15/24` | Short numeric |

**With Time:**

| Format | Output |
|--------|--------|
| `MEDIUM_DATETIME` | `Jan 15, 2024 2:30 PM` |
| `FULL_DATETIME` | `Monday, January 15, 2024 at 2:30 PM` |
| `TIME_12H` | `2:30 PM` |
| `TIME_24H` | `14:30` |

**ISO:**

| Format | Output |
|--------|--------|
| `ISO_DATE` | `2024-01-15` |
| `ISO_DATETIME` | `2024-01-15T14:30:00.000Z` |

**Granular:**

| Format | Output |
|--------|--------|
| `SHORT_DAY` | `Mon` |
| `DAY` | `Monday` |
| `SHORT_MONTH` | `Jan` |
| `MONTH` | `January` |
| `MONTH_YEAR` | `January 2024` |
| `DAY_MONTH` | `15 Jan` |
| `DAY_MONTH_YEAR` | `15 Jan 2024` |
| `ORDINAL_DAY` | `15th` |
| `YEAR` | `2024` |

### Input Types

Accepts `Dayjs`, `Date`, or `string`:

```typescript
formatDate(new Date(), DateFormat.MEDIUM_DATE);
formatDate("2024-01-15", DateFormat.MEDIUM_DATE);
formatDate(dayjs(), DateFormat.MEDIUM_DATE);
```

## formatData

Per-model transformation functions that convert raw API models into display-ready objects. Used primarily by card components in `src/ui/`.

**Location:** `src/lib/format-data/`

### Available Formatters

| Function | Input Model | Key Outputs |
|----------|------------|-------------|
| `formatAccountData` | `AccountModel` | `name`, `initialName`, `formattedAmount`, `type`, `variant`, `hasBudget`, `budgetText`, `budgetIntent` |
| `formatCategoryData` | `CategoryModel` | `name`, `initialName`, `type`, `variant`, `hasBudget`, `budgetText`, `budgetIntent` |
| `formatTransactionData` | `TransactionModel` | `amount`, `relatedAccountName`, `relatedCategoryName`, `time`, `date`, `isIncome`, `isExpense`, `variant` |
| `formatTransactionTemplateData` | `TransactionTemplateModel` | Similar to transaction with template-specific fields |

### Usage

```typescript
import { formatAccountData } from "@/lib/format-data";

const account: AccountModel = { /* from API */ };
const {
  name,                 // "My Savings"
  initialName,          // "MS"
  formattedAmount,      // "Rp1.234.567"
  type,                 // "Expense"
  variant,              // "primary" | "secondary"
  hasBudget,            // true
  budgetText,           // "Remaining: Rp500.000"
  budgetIntent,         // "success" | "warning" | "danger"
  createdAt,            // "January 15, 2024"
} = formatAccountData(account);
```

### Budget Intent Logic

`formatAccountData` and `formatCategoryData` compute a budget badge color:

| Condition | Intent | Color |
|-----------|--------|-------|
| Overspent (negative remaining) | `danger` | Red |
| < 20% remaining | `warning` | Yellow |
| >= 20% remaining | `success` | Green |

## nameToInitials

Converts a full name string into uppercase initials.

**Location:** `src/lib/name-to-initial/name-to-initial.ts`

```typescript
import { nameToInitials } from "@/lib/name-to-initial";

nameToInitials("Dimas Bagus P")  // "DP" (first + last word)
nameToInitials("john doe")       // "JD"
nameToInitials("Madonna")        // "MA" (first 2 chars of single word)
nameToInitials("")               // ""
```

Uses lodash `words()` for word splitting and `deburr()` for accent removal.

## When

A conditional rendering component that evaluates various condition types.

**Location:** `src/lib/when/when.tsx`

### Usage

```typescript
import { When } from "@/lib/when";

// Primitive condition
<When condition={isLoading}>
  <PageLoader />
</When>

// Negation
<When condition={!isLoading}>
  <Content />
</When>

// Array condition (all items must be truthy)
<When condition={[!!account, !error, isReady]}>
  <AccountDetails account={account} />
</When>

// Object condition (all values must be truthy)
<When condition={{ account, category }}>
  <Summary account={account} category={category} />
</When>

// Function children (lazy evaluation)
<When condition={data}>
  {() => <ExpensiveComponent data={data!} />}
</When>
```

### Truthiness Rules

| Condition Type | Renders When |
|---------------|-------------|
| Primitive (`boolean`, `string`, `number`) | Value is truthy |
| Array | Non-empty AND every item is truthy |
| Object | Non-empty AND every value is truthy |
| `null` / `undefined` | Never renders |

### Why Use `When` Instead of `&&`

```typescript
// Problem: React renders 0 as text
{count && <List />}  // Renders "0" when count is 0

// Solution: When handles edge cases
<When condition={count}>
  <List />
</When>
```

`When` is used extensively across card components, drawer views, and statistic tabs for clean conditional rendering.
