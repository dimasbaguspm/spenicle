import { NotebookTabs } from 'lucide-react';
import React from 'react';

import { Tile, DataTable, type ColumnDefinition, IconButton } from '../../../../../components';
import { formatAmount } from '../../../../../libs/format-amount';
import { AccountIcon } from '../../../../account-module/components/account-icon/account-icon';
import type { EnrichedAccountData } from '../helpers';

/**
 * Column definitions for accounts data table.
 * Simplified to show essential metrics: account name, transactions, selected chart type value, and percentage.
 * Follows the enhanced account table pattern with grid layout.
 */
export const createDesktopAccountsColumns = (
  chartType: 'expenses' | 'income' = 'expenses',
  data: EnrichedAccountData[] = []
): ColumnDefinition<EnrichedAccountData>[] => {
  // calculate total for percentage calculation
  const total = data.reduce((sum, account) => {
    return sum + (chartType === 'expenses' ? account.totalExpenses : account.totalIncome);
  }, 0);

  return [
    {
      key: 'accountName',
      label: 'Account',
      sortable: false,
      align: 'left',
      gridColumn: 'span 5', // Larger span for account name
      render: (_, account: EnrichedAccountData) => (
        <div className="flex items-center gap-3">
          <AccountIcon
            iconValue={account.iconValue}
            colorValue={account.colorValue}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{account.accountName}</p>
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
      render: (_, account: EnrichedAccountData) => (
        <p className="text-sm font-medium text-slate-600 tabular-nums">{account.totalTransactions}</p>
      ),
    },
    {
      key: chartType === 'expenses' ? 'totalExpenses' : 'totalIncome',
      label: chartType === 'expenses' ? 'Expenses' : 'Income',
      sortable: false,
      align: 'right',
      gridColumn: 'span 3', // Selected chart type value
      render: (_, account: EnrichedAccountData) => {
        const value = chartType === 'expenses' ? account.totalExpenses : account.totalIncome;
        const colorClass = chartType === 'expenses' ? 'text-coral-600' : 'text-sage-600';

        return (
          <p className={`text-sm font-semibold tabular-nums ${colorClass}`}>
            {formatAmount(value, { compact: false, hidePrefix: true })}
          </p>
        );
      },
    },
    {
      key: 'percentage' as keyof EnrichedAccountData, // Computed percentage column
      label: '% of Total',
      sortable: false,
      align: 'right',
      gridColumn: 'span 2', // Percentage column
      render: (_, account: EnrichedAccountData) => {
        const value = chartType === 'expenses' ? account.totalExpenses : account.totalIncome;
        const percentage = total > 0 ? (value / total) * 100 : 0;
        const colorClass = chartType === 'expenses' ? 'text-coral-600' : 'text-sage-600';

        return <p className={`text-sm font-medium tabular-nums ${colorClass}`}>{percentage.toFixed(1)}%</p>;
      },
    },
  ];
};

interface AccountsTableProps {
  data: EnrichedAccountData[];
  columns?: ColumnDefinition<EnrichedAccountData>[];
  onMoreClick: () => void;
  chartType?: 'expenses' | 'income';
}

/**
 * Table section for accounts breakdown showing essential financial metrics.
 * Simplified view with account name, transactions, selected chart type value, and percentage.
 * Follows enhanced account table pattern with grid layout and proper sorting.
 */
export const AccountsTable: React.FC<AccountsTableProps> = ({
  data,
  columns: _columns,
  chartType = 'expenses',
  onMoreClick,
}) => {
  // Generate columns with data for percentage calculation
  const columns = createDesktopAccountsColumns(chartType, data);

  return (
    <Tile className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-900">Account Details</h3>
            <p className="text-sm text-slate-500">
              Essential account metrics for the selected period (showing {data.length} accounts, sorted by highest{' '}
              {chartType})
            </p>
          </div>
          <IconButton onClick={onMoreClick} variant="mist-ghost" size="sm" title="View more details">
            <NotebookTabs className="h-4 w-4" />
          </IconButton>
        </div>
        <DataTable
          data={data}
          columns={columns}
          emptyMessage="No account data available"
          emptyDescription="Try selecting a different time period or add some transactions"
          className="rounded-lg border border-mist-200"
        />
      </div>
    </Tile>
  );
};
