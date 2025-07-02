import React, { useMemo, useState } from 'react';

import { Tile } from '../../../../components';
import { useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useApiSummaryCategoriesQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Category } from '../../../../types/api';

import { DesktopCategoriesLoader } from './desktop-categories-loader';
import { mapEnrichedCategoryData, mapCategoryPieChartData } from './helpers';
import { CategoriesPieChart, CategoriesTable, createDesktopCategoriesColumns } from './presentation';

interface DesktopCategoriesMainContentProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Main content component for desktop categories analytics.
 * Displays pie chart and data table with category financial data.
 * Follows the same pattern as desktop accounts.
 */
export const DesktopCategories: React.FC<DesktopCategoriesMainContentProps> = ({ startDate, endDate }) => {
  // toggle state for chart type selection
  const [chartType, setChartType] = useState<'expenses' | 'income'>('expenses');

  const [categoriesResponse] = useApiCategoriesQuery({ pageSize: 1000 });
  const allCategories = categoriesResponse?.items;

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

  // enrich category data with metadata and sort by chart type
  const enrichedCategoryData = useMemo(() => {
    const enrichedData = mapEnrichedCategoryData({ categoriesData: categoriesData ?? [], categoryMap });

    // sort by the selected chart type (highest first)
    return enrichedData.sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA;
    });
  }, [categoriesData, categoryMap, chartType]);

  // prepare pie chart data based on selected chart type
  const pieChartData = useMemo(
    () => mapCategoryPieChartData({ categoryData: enrichedCategoryData, chartType }),
    [enrichedCategoryData, chartType]
  );

  const columns = createDesktopCategoriesColumns(chartType);

  if (queryState.isFetching) {
    return (
      <div className="space-y-6">
        <Tile className="p-6">
          <DesktopCategoriesLoader count={5} />
        </Tile>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* pie chart display with integrated toggle */}
      <CategoriesPieChart chartData={pieChartData} chartType={chartType} onChartTypeChange={setChartType} />
      {/* data table */}
      <CategoriesTable data={enrichedCategoryData} columns={columns} chartType={chartType} />
    </div>
  );
};
