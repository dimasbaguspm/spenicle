import type { ColumnDefinition } from '../../../../components/data-table/types';
import type { SummaryTransactionsPeriod } from '../../../../types/api';
import type { PeriodType } from '../../hooks';

// extend the base period data with chart/display properties
type EnrichedPeriodData = SummaryTransactionsPeriod[number] & {
  label?: string;
  transactionCount?: number;
};

/**
 * Column definitions for period breakdown data table.
 * Displays period information with financial metrics in a structured format.
 */
export const createPeriodBreakdownColumns = (
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
