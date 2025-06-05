// expense-breakdown-card-list.tsx
// Card list component for ExpenseBreakdown (renders category period cards)
import React from 'react';

import type { SummaryCategoriesPeriod, Category } from '../../../../types/api';

import { ExpenseCard } from './expense-card';
import { ExpenseNotFoundCard } from './expense-not-found-card';

export interface ExpenseCardListProps {
  periods: SummaryCategoriesPeriod;
  categories?: Category[];
}

export const ExpenseCardList: React.FC<ExpenseCardListProps> = ({ periods, categories }) => {
  // Filter and sort periods by totalExpenses descending
  const filtered = (periods ?? []).filter((cat) => (cat.totalExpenses ?? 0) > 0);
  const sorted = filtered.sort((a, b) => (b.totalExpenses ?? 0) - (a.totalExpenses ?? 0));
  const totalExpenses = filtered.reduce((sum, cat) => sum + Math.abs(cat.totalExpenses ?? 0), 0);

  return (
    <div className="space-y-4">
      {sorted.length === 0 ? (
        <ExpenseNotFoundCard />
      ) : (
        sorted.map((categoryPeriod) => {
          const percentage = totalExpenses > 0 ? ((categoryPeriod.totalExpenses ?? 0) / totalExpenses) * 100 : 0;
          const category = categories?.find((cat) => cat.id === categoryPeriod.categoryId);
          return (
            <ExpenseCard
              key={categoryPeriod.categoryId}
              category={category}
              totalExpenses={categoryPeriod.totalExpenses ?? 0}
              percentage={percentage}
              totalTransactions={categoryPeriod.totalTransactions ?? 0}
            />
          );
        })
      )}
    </div>
  );
};
