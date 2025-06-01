# useSeamlessTransactions Hook Migration Guide

## Overview

The `useSeamlessTransactions` hook has been reworked to provide a more flexible and modern API for fetching transaction data. The new version uses date ranges instead of relative date calculations and returns a promise-based callback instead of reactive state.

## Breaking Changes

### Old API (Legacy)
```typescript
const {
  dayRanges,
  getTransactionsForRange,
  isLoading,
  isError,
  error,
  canLoadMore,
  loadMoreDays
} = useSeamlessTransactions({
  selectedDate: new Date(),
  groupId?: number,
  accountId?: number,
  categoryId?: number,
  maxDaysBefore: 4
});
```

### New API
```typescript
const { fetchFormattedTransactions } = useSeamlessTransactions({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-07'),
  groupId?: number,
  accountId?: number,
  categoryId?: number
});

// Usage
const transactions = await fetchFormattedTransactions();
```

## Migration Steps

### 1. Update Hook Import
```typescript
// Old - will continue to work
import { useSeamlessTransactions } from './hooks/use-seamless-transactions-legacy';

// New
import { useSeamlessTransactions } from './hooks/use-seamless-transactions';
```

### 2. Change Parameters
```typescript
// Old
const hook = useSeamlessTransactions({
  selectedDate: new Date(),
  maxDaysBefore: 7,
  accountId: 123
});

// New
const endDate = new Date();
const startDate = new Date();
startDate.setDate(endDate.getDate() - 7);

const hook = useSeamlessTransactions({
  startDate,
  endDate,
  accountId: 123
});
```

### 3. Update Usage Pattern
```typescript
// Old - reactive state
const { dayRanges, isLoading } = useSeamlessTransactions(params);

useEffect(() => {
  // React to dayRanges changes
  console.log('Transactions loaded:', dayRanges);
}, [dayRanges]);

// New - imperative callback
const { fetchFormattedTransactions } = useSeamlessTransactions(params);

const handleLoadTransactions = async () => {
  try {
    const transactions = await fetchFormattedTransactions();
    console.log('Transactions loaded:', transactions);
  } catch (error) {
    console.error('Failed to load transactions:', error);
  }
};
```

## Benefits of the New API

1. **More Control**: Fetch transactions when needed rather than automatically
2. **Better Error Handling**: Promise-based approach with explicit error handling
3. **Flexible Date Ranges**: Specify exact start and end dates
4. **Simpler State Management**: No need to manage multiple loading/error states
5. **Better TypeScript Support**: Improved type inference and safety

## Backward Compatibility

The original implementation is preserved in `use-seamless-transactions-legacy.ts` to ensure existing components continue to work without modification. You can migrate components gradually to the new API.

## Testing

A test component is available at `components/seamless-transaction-test` to demonstrate the new hook usage.

## Example Usage

```typescript
import React, { useState } from 'react';
import { useSeamlessTransactions } from './hooks/use-seamless-transactions';

function TransactionLoader() {
  const [transactions, setTransactions] = useState([]);
  
  const { fetchFormattedTransactions } = useSeamlessTransactions({
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    accountId: 123
  });

  const loadTransactions = async () => {
    try {
      const data = await fetchFormattedTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  return (
    <div>
      <button onClick={loadTransactions}>Load Transactions</button>
      {/* Render transactions */}
    </div>
  );
}
```
