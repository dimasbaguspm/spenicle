import { ButtonIcon, Text, Tile } from '@dimasbaguspm/versaur/primitive';
import { NotebookTabs } from 'lucide-react';
import React from 'react';

import { DataTable, type ColumnDefinition } from '../../../../../components';
import { formatAmount } from '../../../../../libs/format-amount';
import type { PeriodType } from '../../../hooks';

import type { EnrichedPeriodData } from './types';

/**
 * Column definitions for period breakdown data table.
 * Simplified to show essential metrics: period name, transactions, income, and expenses.
 * Follows the enhanced account table pattern with grid layout.
 */
export const createDesktopPeriodBreakdownColumns = (periodType: PeriodType): ColumnDefinition<EnrichedPeriodData>[] => [
  {
    key: 'startDate',
    label: periodType === 'weekly' ? 'Day' : periodType === 'monthly' ? 'Week' : 'Month',
    sortable: false,
    align: 'left',
    gridColumn: 'span 4', // Larger span for period name
    render: (_, period: EnrichedPeriodData) => (
      <Text as="span" fontSize="base" fontWeight="medium">
        {period.label}
      </Text>
    ),
  },
  {
    key: 'transactionCount',
    label: 'Transactions',
    sortable: false,
    align: 'center',
    gridColumn: 'span 2', // Transactions column
    render: (_, period: EnrichedPeriodData) => (
      <Text as="p" fontSize="sm" fontWeight="medium" align="center">
        {period.transactionCount ?? 0}
      </Text>
    ),
  },
  {
    key: 'totalIncome',
    label: 'Income',
    sortable: false,
    align: 'right',
    gridColumn: 'span 3', // Income column
    render: (_, period: EnrichedPeriodData) => (
      <Text as="p" fontSize="sm" fontWeight="semibold" color="secondary" align="right">
        {formatAmount(period.totalIncome ?? 0, {
          type: 'income',
          hidePrefix: true,
        })}
      </Text>
    ),
  },
  {
    key: 'totalExpenses',
    label: 'Expenses',
    sortable: false,
    align: 'right',
    gridColumn: 'span 3', // Expenses column
    render: (_, period: EnrichedPeriodData) => (
      <Text as="p" fontSize="sm" fontWeight="semibold" color="primary" align="right">
        {formatAmount(period.totalExpenses ?? 0, {
          type: 'expense',
          hidePrefix: true,
        })}
      </Text>
    ),
  },
];

interface PeriodBreakdownTableProps {
  data: Array<Record<string, unknown>>;
  columns: ColumnDefinition<Record<string, unknown>>[];
  periodType: string;
  onMoreClick: () => void;
}

// table section for period breakdown showing essential financial metrics
export const PeriodBreakdownTable: React.FC<PeriodBreakdownTableProps> = ({
  data,
  columns,
  periodType,
  onMoreClick,
}) => (
  <Tile className="space-y-6">
    <div className="flex justify-between align-center">
      <div className="space-y-1">
        <Text as="h3" fontSize="xl" fontWeight="semibold">
          Period Breakdown Details
        </Text>
        <Text as="p" fontSize="sm">
          Essential period metrics for the selected timeframe (showing {data.length}{' '}
          {periodType === 'weekly' ? 'days' : periodType === 'monthly' ? 'weeks' : 'months'})
        </Text>
      </div>
      <ButtonIcon as={NotebookTabs} variant="ghost" size="sm" aria-label="View more details" onClick={onMoreClick} />
    </div>
    <DataTable
      data={data}
      columns={columns}
      emptyMessage="No period data available"
      emptyDescription="Try selecting a different time period or add some transactions"
      className="rounded-lg border border-mist-200"
    />
  </Tile>
);
