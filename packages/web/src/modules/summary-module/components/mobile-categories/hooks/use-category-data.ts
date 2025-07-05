import { useMemo } from 'react';

import type { Category, SummaryCategoriesPeriod } from '../../../../../types/api';
import type { EnrichedCategoryData } from '../helpers/mobile-categories-mappers';

interface UseCategoryDataParams {
  data: SummaryCategoriesPeriod;
  categoryMap: Record<number, Category>;
}

interface UseCategoryDataReturn {
  enrichedData: EnrichedCategoryData[];
  hasData: boolean;
  totalCategories: number;
}

/**
 * Custom hook to process and enrich category data for mobile categories component
 * Follows the same pattern as mobile period breakdown
 */
export function useCategoryData({ data, categoryMap }: UseCategoryDataParams): UseCategoryDataReturn {
  const enrichedData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data
      .filter((item) => item.categoryId != null)
      .map((item) => {
        const category = categoryMap[item.categoryId!];
        return {
          categoryId: item.categoryId!,
          categoryName: category?.name ?? 'Unknown Category',
          iconValue: category?.metadata?.icon,
          colorValue: category?.metadata?.color,
          totalIncome: item.totalIncome ?? 0,
          totalExpenses: item.totalExpenses ?? 0,
          totalNet: item.totalNet ?? 0,
          totalTransactions: item.totalTransactions ?? 0,
          startDate: item.startDate,
          endDate: item.endDate,
        };
      });
  }, [data, categoryMap]);

  const hasData = enrichedData.length > 0;
  const totalCategories = enrichedData.length;

  return {
    enrichedData,
    hasData,
    totalCategories,
  };
}
