// mobile-category component, renamed from category.tsx
import React, { useMemo } from 'react';

import { Tile, RadarChart } from '../../../../components';
import { useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useApiSummaryCategoriesQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Category } from '../../../../types/api';

import { MobileCategoryCardList } from './mobile-category-card-list';
import { MobileCategoryLoader } from './mobile-category-loader';

interface MobileCategoriesProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

export const MobileCategories: React.FC<MobileCategoriesProps> = ({ startDate, endDate }) => {
  const [summaryData, , queryState] = useApiSummaryCategoriesQuery(
    {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    {
      staleTime: 60000,
      gcTime: 300000,
    }
  );
  const [categoriesResponse] = useApiCategoriesQuery({ pageSize: 1000 });
  const allCategories =
    categoriesResponse && 'items' in categoriesResponse ? (categoriesResponse.items as Category[]) : [];

  // build a map of categoryId to summary object
  const summaryMap = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    if (summaryData && Array.isArray(summaryData)) {
      for (const summary of summaryData) {
        if (summary.categoryId != null) map.set(summary.categoryId, summary);
      }
    }
    return map;
  }, [summaryData]);

  // merge all categories with summary data, so all categories are shown even if no transactions
  const mergedCategoriesData = useMemo(() => {
    if (!allCategories) return [];
    return allCategories.map((category) => {
      const summary = summaryMap.get(category.id ?? -1) ?? {};
      return {
        categoryId: category.id,
        totalIncome: typeof summary.totalIncome === 'number' ? summary.totalIncome : 0,
        totalExpenses: typeof summary.totalExpenses === 'number' ? summary.totalExpenses : 0,
        totalNet: typeof summary.totalNet === 'number' ? summary.totalNet : 0,
        totalTransactions: typeof summary.totalTransactions === 'number' ? summary.totalTransactions : 0,
        startDate: typeof summary.startDate === 'string' ? summary.startDate : undefined,
        endDate: typeof summary.endDate === 'string' ? summary.endDate : undefined,
      };
    });
  }, [allCategories, summaryMap]);

  return (
    <Tile className="p-6">
      {queryState.isFetching ? (
        <MobileCategoryLoader count={5} />
      ) : (
        <div className="space-y-6">
          <RadarChart
            data={mergedCategoriesData.map(({ categoryId, ...rest }) => ({
              category: allCategories.find((c) => c.id === categoryId)?.name ?? 'Unknown',
              ...rest,
            }))}
            dataKey={['totalIncome', 'totalExpenses']}
            legendAlign="center"
          />
          <MobileCategoryCardList periods={mergedCategoriesData} categories={allCategories} />
        </div>
      )}
    </Tile>
  );
};
