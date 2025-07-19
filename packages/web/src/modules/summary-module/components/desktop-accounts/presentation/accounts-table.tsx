import { ButtonIcon, Text, Tile } from '@dimasbaguspm/versaur';
import { NotebookTabs } from 'lucide-react';
import React from 'react';

import { DataTable, type ColumnDefinition } from '../../../../../components';
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
            <Text as="p" fontSize="sm" fontWeight="medium" ellipsis clamp={1}>
              {account.accountName}
            </Text>
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
        <Text as="p" fontSize="sm" fontWeight="medium" align="center">
          {account.totalTransactions}
        </Text>
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
        const colorClass = chartType === 'expenses' ? 'primary' : 'secondary';

        return (
          <Text as="p" fontSize="sm" fontWeight="semibold" color={colorClass} align="right">
            {formatAmount(value, { compact: false, hidePrefix: true })}
          </Text>
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

        return (
          <Text as="p" fontSize="sm" fontWeight="medium" align="right">
            {percentage.toFixed(1)}%
          </Text>
        );
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
    <Tile className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Text as="h3" fontSize="xl" fontWeight="semibold">
            Account Details
          </Text>
          <Text as="p" fontSize="sm">
            Essential account metrics for the selected period (showing {data.length} accounts, sorted by highest{' '}
            {chartType})
          </Text>
        </div>
        <ButtonIcon as={NotebookTabs} onClick={onMoreClick} aria-label="View more details" variant="ghost" />
      </div>
      <DataTable
        data={data}
        columns={columns}
        emptyMessage="No account data available"
        emptyDescription="Try selecting a different time period or add some transactions"
        className="rounded-lg border border-mist-200"
      />
    </Tile>
  );
};
