// ExpenseBreakdown.tsx
// Modular component for category-based expense analytics, following period-breakdown pattern
import React, { useMemo } from 'react';

import { Tile } from '../../../../components';
import { useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useApiSummaryCategoriesQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Category } from '../../../../types/api';

import { ExpenseCardList } from './expense-card-list';
import { ExpenseHeader } from './expense-header';
import { ExpenseLoader } from './expense-loader';
import { getPeriodRange } from './helpers';

interface ExpenseProps {
  periodType: 'weekly' | 'monthly' | 'yearly';
  periodIndex: number;
  setPeriodType: (type: 'weekly' | 'monthly' | 'yearly') => void;
  setPeriodIndex: (index: number) => void;
}

export const Expense: React.FC<ExpenseProps> = ({ periodType, periodIndex, setPeriodType, setPeriodIndex }) => {
  // Calculate period range
  const { startDate, endDate } = useMemo(() => getPeriodRange(periodType, periodIndex), [periodType, periodIndex]);

  const [data, , queryState] = useApiSummaryCategoriesQuery({ startDate, endDate }, { staleTime: 0, gcTime: 0 });

  // Fetch all categories for mapping names/colors
  const [categories] = useApiCategoriesQuery({ pageSize: 1000 });

  return (
    <Tile className="p-6">
      <ExpenseHeader
        periodType={periodType}
        periodIndex={periodIndex}
        setPeriodType={setPeriodType}
        setPeriodIndex={setPeriodIndex}
      />
      {queryState.isFetching ? (
        <ExpenseLoader count={5} />
      ) : (
        <ExpenseCardList
          periods={data ?? []}
          categories={categories && 'items' in categories ? (categories.items as Category[]) : []}
        />
      )}
    </Tile>
  );
};
