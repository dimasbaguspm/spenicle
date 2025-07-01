import React, { useMemo } from 'react';

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

  // enrich category data with metadata
  const enrichedCategoryData = useMemo(
    () => mapEnrichedCategoryData({ categoriesData: categoriesData ?? [], categoryMap }),
    [categoriesData, categoryMap]
  );

  // prepare pie chart data (default to expenses view)
  const pieChartData = useMemo(
    () => mapCategoryPieChartData({ categoryData: enrichedCategoryData, chartType: 'expenses' }),
    [enrichedCategoryData]
  );

  const columns = createDesktopCategoriesColumns();

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
      {/* pie chart display */}
      <CategoriesPieChart chartData={pieChartData} chartType="expenses" />
      {/* data table */}
      <CategoriesTable data={enrichedCategoryData} columns={columns} />
    </div>
  );
};
