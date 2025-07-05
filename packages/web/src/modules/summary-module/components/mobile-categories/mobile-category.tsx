// mobile-category component, renamed from category.tsx
import React, { useMemo, useState } from 'react';

import { useApiCategoriesQuery } from '../../../../hooks/use-api/built-in/use-categories';
import { useApiSummaryCategoriesQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Category } from '../../../../types/api';

import { mapCategoryPieChartData } from './helpers/mobile-categories-mappers';
import { useCategoryData } from './hooks/use-category-data';
import { MobileCategoriesLoader } from './mobile-categories-loader';
import { MobileCategoriesPieChart, MobileCategoriesTable } from './presentation';

interface MobileCategoriesProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

export const MobileCategories: React.FC<MobileCategoriesProps> = ({ startDate, endDate }) => {
  const [chartType, setChartType] = useState<'expenses' | 'income'>('expenses');

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

  // build category map for quick lookup
  const categoryMap = useMemo(() => {
    return allCategories.reduce(
      (acc, category) => {
        if (category.id) {
          acc[category.id] = category;
        }
        return acc;
      },
      {} as Record<number, Category>
    );
  }, [allCategories]);

  // use the new modular data processing hook
  const { enrichedData, hasData } = useCategoryData({
    data: summaryData ?? [],
    categoryMap,
  });

  // prepare pie chart data using the new mapper
  const pieChartData = useMemo(() => {
    return mapCategoryPieChartData({
      categoryData: enrichedData,
      chartType,
    });
  }, [enrichedData, chartType]);

  if (queryState.isFetching) {
    return <MobileCategoriesLoader count={5} />;
  }

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="text-slate-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No category data available</h3>
          <p className="text-sm text-slate-500">No transactions found for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileCategoriesPieChart chartData={pieChartData} chartType={chartType} onChartTypeChange={setChartType} />

      <MobileCategoriesTable
        data={enrichedData}
        categories={allCategories}
        chartType={chartType}
        onCategoryClick={(categoryId) => {
          // optional: handle category click for navigation
          // could navigate to category detail view
          void categoryId;
        }}
      />
    </div>
  );
};
