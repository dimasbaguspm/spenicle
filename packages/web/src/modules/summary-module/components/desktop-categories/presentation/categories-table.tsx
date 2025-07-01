import React from 'react';

import { Tile, DataTable, type ColumnDefinition } from '../../../../../components';
import { CategoryIcon } from '../../../../category-module/components/category-icon/category-icon';
import type { EnrichedCategoryData } from '../helpers';

/**
 * Column definitions for categories data table.
 * Displays category information with financial metrics in a structured format.
 */
export const createDesktopCategoriesColumns = (): ColumnDefinition<EnrichedCategoryData>[] => [
  {
    key: 'categoryName',
    label: 'Category',
    width: 'minmax(200px, 1fr)',
    render: (_, category: EnrichedCategoryData) => (
      <div className="flex items-center gap-3">
        <CategoryIcon iconValue={category.iconValue} colorValue={category.colorValue} size="sm" />
        <span className="font-medium text-slate-900">{category.categoryName}</span>
      </div>
    ),
  },
  {
    key: 'totalIncome',
    label: 'Income',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, category: EnrichedCategoryData) => (
      <span className="text-emerald-600 font-medium">
        ${category.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'totalExpenses',
    label: 'Expenses',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, category: EnrichedCategoryData) => (
      <span className="text-coral-600 font-medium">
        ${category.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'totalNet',
    label: 'Net',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, category: EnrichedCategoryData) => {
      const net = category.totalNet;
      const isPositive = net >= 0;
      return (
        <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-coral-600'}`}>
          {isPositive ? '+' : ''}${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    key: 'totalTransactions',
    label: 'Transactions',
    align: 'center',
    width: 'minmax(100px, 1fr)',
    render: (_, category: EnrichedCategoryData) => <span className="text-slate-600">{category.totalTransactions}</span>,
  },
];

interface CategoriesTableProps {
  data: EnrichedCategoryData[];
  columns: ColumnDefinition<EnrichedCategoryData>[];
}

/**
 * Table section for categories breakdown showing detailed financial metrics
 */
export const CategoriesTable: React.FC<CategoriesTableProps> = ({ data, columns }) => (
  <Tile className="p-6">
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Category Details</h3>
        <p className="text-sm text-slate-600">Detailed financial metrics for each category in the selected period</p>
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
