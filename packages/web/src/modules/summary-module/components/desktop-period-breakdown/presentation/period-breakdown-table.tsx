import React from 'react';

import { Tile, DataTable, type ColumnDefinition } from '../../../../../components';
import { formatAmount } from '../../../../../libs/format-amount';
import type { PeriodType } from '../../../hooks';

import type { EnrichedPeriodData } from './types';

/**
 * Column definitions for period breakdown data table.
 * Simplified to show essential metrics: period name, transactions, income, and expenses.
 * Follows the enhanced account table pattern with grid layout.
 */
export const createDesktopPeriodBreakdownColumns = (
  periodType: PeriodType,
  onPeriodClick: (period: EnrichedPeriodData) => Promise<void>
): ColumnDefinition<EnrichedPeriodData>[] => [
  {
    key: 'startDate',
    label: periodType === 'weekly' ? 'Day' : periodType === 'monthly' ? 'Week' : 'Month',
    sortable: false,
    align: 'left',
    gridColumn: 'span 4', // Larger span for period name
    render: (_, period: EnrichedPeriodData) => (
      <button
        onClick={() => onPeriodClick(period)}
        className="text-left font-medium text-coral-600 hover:text-coral-700 transition-colors"
      >
        {period.label ?? 'Unknown Period'}
      </button>
    ),
  },
  {
    key: 'transactionCount',
    label: 'Transactions',
    sortable: false,
    align: 'center',
    gridColumn: 'span 2', // Transactions column
    render: (_, period: EnrichedPeriodData) => (
      <p className="text-sm font-medium text-slate-600 tabular-nums">{period.transactionCount ?? 0}</p>
    ),
  },
  {
    key: 'totalIncome',
    label: 'Income',
    sortable: false,
    align: 'right',
    gridColumn: 'span 3', // Income column
    render: (_, period: EnrichedPeriodData) => (
      <p className="text-sm font-semibold text-sage-600 tabular-nums">
        {formatAmount(period.totalIncome ?? 0, {
          type: 'income',
          hidePrefix: true,
        })}
      </p>
    ),
  },
  {
    key: 'totalExpenses',
    label: 'Expenses',
    sortable: false,
    align: 'right',
    gridColumn: 'span 3', // Expenses column
    render: (_, period: EnrichedPeriodData) => (
      <p className="text-sm font-semibold text-coral-600 tabular-nums">
        {formatAmount(period.totalExpenses ?? 0, {
          type: 'expense',
          hidePrefix: true,
        })}
      </p>
    ),
  },
];

interface PeriodBreakdownTableProps {
  data: Array<Record<string, unknown>>;
  columns: ColumnDefinition<Record<string, unknown>>[];
  periodType: string;
}

// table section for period breakdown showing essential financial metrics
export const PeriodBreakdownTable: React.FC<PeriodBreakdownTableProps> = ({ data, columns, periodType }) => (
  <Tile className="p-4 md:p-6">
    <div className="space-y-4 md:space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg md:text-xl font-semibold text-slate-900">Period Breakdown Details</h3>
        <p className="text-sm text-slate-500">
          Essential period metrics for the selected timeframe (showing {data.length}{' '}
          {periodType === 'weekly' ? 'days' : periodType === 'monthly' ? 'weeks' : 'months'})
        </p>
      </div>
      <DataTable
        data={data}
        columns={columns}
        emptyMessage="No period data available"
        emptyDescription="Try selecting a different time period or add some transactions"
        className="rounded-lg border border-mist-200"
      />
    </div>
  </Tile>
);
