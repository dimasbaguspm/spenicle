import React from 'react';

import { Tile, DataTable, type ColumnDefinition } from '../../../../../components';
import { formatAmount } from '../../../../../libs/format-amount';
import { CategoryIcon } from '../../../../category-module/components/category-icon/category-icon';
import type { EnrichedCategoryData } from '../helpers';

/**
 * Column definitions for categories data table.
 * Simplified to show essential metrics: category name, transactions, selected chart type value, and percentage.
 * Follows the enhanced account table pattern with grid layout.
 */
export const createDesktopCategoriesColumns = (
  chartType: 'expenses' | 'income' = 'expenses',
  data: EnrichedCategoryData[] = []
): ColumnDefinition<EnrichedCategoryData>[] => {
  // calculate total for percentage calculation
  const total = data.reduce((sum, category) => {
    return sum + (chartType === 'expenses' ? category.totalExpenses : category.totalIncome);
  }, 0);

  return [
    {
      key: 'categoryName',
      label: 'Category',
      sortable: false,
      align: 'left',
      gridColumn: 'span 5', // Larger span for category name
      render: (_, category: EnrichedCategoryData) => (
        <div className="flex items-center gap-3">
          <CategoryIcon
            iconValue={category.iconValue}
            colorValue={category.colorValue}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{category.categoryName}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'totalTransactions',
      label: 'Transactions',
      sortable: false,
      align: 'center',
      gridColumn: 'span 2', // Transactions column
      render: (_, category: EnrichedCategoryData) => (
        <p className="text-sm font-medium text-slate-600 tabular-nums">{category.totalTransactions}</p>
      ),
    },
    {
      key: chartType === 'expenses' ? 'totalExpenses' : 'totalIncome',
      label: chartType === 'expenses' ? 'Expenses' : 'Income',
      sortable: false,
      align: 'right',
      gridColumn: 'span 3', // Selected chart type value
      render: (_, category: EnrichedCategoryData) => {
        const value = chartType === 'expenses' ? category.totalExpenses : category.totalIncome;
        const colorClass = chartType === 'expenses' ? 'text-coral-600' : 'text-sage-600';

        return (
          <p className={`text-sm font-semibold tabular-nums ${colorClass}`}>
            {formatAmount(value, { compact: false, hidePrefix: true })}
          </p>
        );
      },
    },
    {
      key: 'percentage' as keyof EnrichedCategoryData, // Computed percentage column
      label: '% of Total',
      sortable: false,
      align: 'right',
      gridColumn: 'span 2', // Percentage column
      render: (_, category: EnrichedCategoryData) => {
        const value = chartType === 'expenses' ? category.totalExpenses : category.totalIncome;
        const percentage = total > 0 ? (value / total) * 100 : 0;
        const colorClass = chartType === 'expenses' ? 'text-coral-500' : 'text-sage-500';

        return <p className={`text-sm font-medium tabular-nums ${colorClass}`}>{percentage.toFixed(1)}%</p>;
      },
    },
  ];
};

interface CategoriesTableProps {
  data: EnrichedCategoryData[];
  columns: ColumnDefinition<EnrichedCategoryData>[];
  chartType?: 'expenses' | 'income';
}

/**
 * Table section for categories breakdown showing essential financial metrics.
 * Simplified view with category name, transactions, selected chart type value, and percentage.
 * Follows enhanced account table pattern with grid layout and proper sorting.
 */
export const CategoriesTable: React.FC<CategoriesTableProps> = ({
  data,
  columns: _columns,
  chartType = 'expenses',
}) => {
  // Generate columns with data for percentage calculation
  const columns = createDesktopCategoriesColumns(chartType, data);

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg md:text-xl font-semibold text-slate-900">Category Details</h3>
          <p className="text-sm text-slate-500">
            Essential category metrics for the selected period (showing {data.length} categories, sorted by highest{' '}
            {chartType})
          </p>
        </div>
        <DataTable
          data={data}
          columns={columns}
          emptyMessage="No category data available"
          emptyDescription="Try selecting a different time period or add some transactions with categories"
          className="rounded-lg border border-mist-200"
        />
      </div>
    </Tile>
  );
};
