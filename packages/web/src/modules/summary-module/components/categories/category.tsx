import React, { useMemo } from 'react';

import { Tile, RadarChart } from '../../../../components';
import { useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useApiSummaryCategoriesQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Category } from '../../../../types/api';

import { CategoryCardList } from './category-card-list';
import { CategoriesHeader } from './category-header';
import { CategoriesLoader } from './category-loader';
import { getPeriodRange } from './helpers';

interface CategoriesProps {
  periodType: 'weekly' | 'monthly' | 'yearly';
  periodIndex: number;
  setPeriodType: (type: 'weekly' | 'monthly' | 'yearly') => void;
  setPeriodIndex: (index: number) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ periodType, periodIndex, setPeriodType, setPeriodIndex }) => {
  const { startDate, endDate } = useMemo(() => getPeriodRange(periodType, periodIndex), [periodType, periodIndex]);

  const [summaryData, , queryState] = useApiSummaryCategoriesQuery(
    { startDate, endDate },
    {
      staleTime: 60000,
      gcTime: 300000,
    }
  );
  const [categoriesResponse] = useApiCategoriesQuery({ pageSize: 1000 });
  const allCategories =
    categoriesResponse && 'items' in categoriesResponse ? (categoriesResponse.items as Category[]) : [];

  // Build a map of categoryId to summary object
  const summaryMap = useMemo(() => {
    const map = new Map<number, Record<string, unknown>>();
    if (summaryData && Array.isArray(summaryData)) {
      for (const summary of summaryData) {
        if (summary.categoryId != null) map.set(summary.categoryId, summary);
      }
    }
    return map;
  }, [summaryData]);

  // Merge all categories with summary data, so all categories are shown even if no transactions
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
      <CategoriesHeader
        periodType={periodType}
        periodIndex={periodIndex}
        setPeriodType={setPeriodType}
        setPeriodIndex={setPeriodIndex}
      />

      {queryState.isFetching ? (
        <CategoriesLoader count={5} />
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
          <CategoryCardList periods={mergedCategoriesData} categories={allCategories} />
        </div>
      )}
    </Tile>
  );
};
