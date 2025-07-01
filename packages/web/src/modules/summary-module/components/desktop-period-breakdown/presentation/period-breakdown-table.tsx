import React from 'react';

import { Tile, DataTable, type ColumnDefinition } from '../../../../../components';
import type { PeriodType } from '../../../hooks';

import type { EnrichedPeriodData } from './types';

/**
 * Column definitions for period breakdown data table.
 * Displays period information with financial metrics in a structured format.
 */
export const createDesktopPeriodBreakdownColumns = (
  periodType: PeriodType,
  onPeriodClick: (period: EnrichedPeriodData) => Promise<void>
): ColumnDefinition<EnrichedPeriodData>[] => [
  {
    key: 'startDate',
    label: periodType === 'weekly' ? 'Day' : periodType === 'monthly' ? 'Week' : 'Month',
    width: 'minmax(120px, 1fr)',
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
    key: 'totalIncome',
    label: 'Income',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, period: EnrichedPeriodData) => (
      <span className="text-emerald-600 font-medium">
        ${(period.totalIncome ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'totalExpenses',
    label: 'Expenses',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, period: EnrichedPeriodData) => (
      <span className="text-coral-600 font-medium">
        ${(period.totalExpenses ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'netAmount',
    label: 'Net',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, period: EnrichedPeriodData) => {
      const net = period.netAmount ?? 0;
      const isPositive = net >= 0;
      return (
        <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-coral-600'}`}>
          {isPositive ? '+' : ''}${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    key: 'startDate',
    label: 'Transactions',
    align: 'center',
    width: 'minmax(80px, 1fr)',
    render: (_, period: EnrichedPeriodData) => <span className="text-slate-600">{period.transactionCount ?? 0}</span>,
  },
];

interface PeriodBreakdownTableProps {
  data: Array<Record<string, unknown>>;
  columns: ColumnDefinition<Record<string, unknown>>[];
  periodType: string;
}

// table section for period breakdown
export const PeriodBreakdownTable: React.FC<PeriodBreakdownTableProps> = ({ data, columns, periodType }) => (
  <Tile className="p-6">
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Period Breakdown Details</h3>
        <p className="text-sm text-slate-600">
          Detailed financial metrics for each{' '}
          {periodType === 'weekly' ? 'day' : periodType === 'monthly' ? 'week' : 'month'}
        </p>
      </div>
      <DataTable
        data={data}
        columns={columns}
        emptyMessage="No period data available"
        emptyDescription="Try selecting a different time period or check back later"
        className="rounded-lg border border-mist-200"
      />
    </div>
  </Tile>
);
