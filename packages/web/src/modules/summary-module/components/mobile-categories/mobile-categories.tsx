import React, { useMemo, useState } from 'react';

import { useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useApiSummaryCategoriesQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Category } from '../../../../types/api';

import { mapCategoryPieChartData } from './helpers/mobile-categories-mappers';
import { useCategoryData } from './hooks';
import { MobileCategoriesLoader } from './mobile-categories-loader';
import { MobileCategoriesPieChart, MobileCategoriesTable } from './presentation';

export interface MobileCategoriesProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Main content component for mobile categories analytics.
 * Displays pie chart and card-based table with category financial data.
 * Follows the same pattern as mobile period breakdown.
 */
export const MobileCategories: React.FC<MobileCategoriesProps> = ({ startDate, endDate }) => {
  // toggle state for chart type selection
  const [chartType, setChartType] = useState<'expenses' | 'income'>('expenses');

  const [categoriesResponse] = useApiCategoriesQuery({ pageSize: 1000 });
  const allCategories = categoriesResponse?.items ?? [];

  const [categoriesData, , queryState] = useApiSummaryCategoriesQuery(
    {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    {
      staleTime: 60000,
      gcTime: 300000,
    }
  );

  // build category map for enriched data
  const categoryMap = useMemo(() => {
    if (allCategories && Array.isArray(allCategories)) {
      return allCategories.reduce(
        (acc, category) => {
          if (category.id) {
            acc[category.id] = category;
          }
          return acc;
        },
        {} as Record<number, Category>
      );
    }
    return {};
  }, [allCategories]);

  // use custom hook for enriched data processing
  const { enrichedData } = useCategoryData({ data: categoriesData ?? [], categoryMap });

  // sort enriched data by chart type for display
  const sortedEnrichedData = useMemo(() => {
    return enrichedData.sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA;
    });
  }, [enrichedData, chartType]);

  // prepare pie chart data based on selected chart type
  const pieChartData = useMemo(
    () => mapCategoryPieChartData({ categoryData: sortedEnrichedData, chartType }),
    [sortedEnrichedData, chartType]
  );

  if (queryState.isFetching) {
    return <MobileCategoriesLoader count={5} />;
  }

  return (
    <div className="space-y-6">
      {/* pie chart display with mobile-optimized toggle */}
      <MobileCategoriesPieChart chartData={pieChartData} chartType={chartType} onChartTypeChange={setChartType} />
      {/* mobile-optimized card table */}
      <MobileCategoriesTable data={sortedEnrichedData} categories={allCategories} chartType={chartType} />
    </div>
  );
};
