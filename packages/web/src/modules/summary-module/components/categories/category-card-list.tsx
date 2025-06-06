import React from 'react';

import type { SummaryCategoriesPeriod, Category } from '../../../../types/api';

import { CategoryCard } from './category-card';

export interface CategoryCardListProps {
  periods: SummaryCategoriesPeriod;
  categories?: Category[];
}

export const CategoryCardList: React.FC<CategoryCardListProps> = ({ periods, categories }) => {
  const allCategoryIds = categories?.map((cat) => cat.id) ?? [];
  const periodsMap = new Map((periods ?? []).map((p) => [p.categoryId, p]));
  const merged = allCategoryIds.map((categoryId) => {
    const period = periodsMap.get(categoryId) ?? {};
    return {
      categoryId,
      totalExpenses: typeof period.totalExpenses === 'number' ? period.totalExpenses : 0,
      totalTransactions: typeof period.totalTransactions === 'number' ? period.totalTransactions : 0,
      ...period,
    };
  });

  const sorted = merged.sort((a, b) => (b.totalExpenses ?? 0) - (a.totalExpenses ?? 0));

  return (
    <div className="space-y-4">
      {sorted.map((categoryPeriod: SummaryCategoriesPeriod[number]) => {
        const category = categories?.find((cat) => cat.id === categoryPeriod.categoryId);
        return <CategoryCard key={categoryPeriod.categoryId} category={category} categoryPeriod={categoryPeriod} />;
      })}
    </div>
  );
};
