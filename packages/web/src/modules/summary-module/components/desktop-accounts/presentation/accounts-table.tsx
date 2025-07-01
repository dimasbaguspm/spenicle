import React from 'react';

import { Tile, DataTable, type ColumnDefinition } from '../../../../../components';
import { AccountIcon } from '../../../../account-module/components/account-icon/account-icon';
import type { EnrichedAccountData } from '../helpers';

/**
 * Column definitions for accounts data table.
 * Displays account information with financial metrics in a structured format.
 */
export const createDesktopAccountsColumns = (): ColumnDefinition<EnrichedAccountData>[] => [
  {
    key: 'accountName',
    label: 'Account',
    width: 'minmax(200px, 1fr)',
    render: (_, account: EnrichedAccountData) => (
      <div className="flex items-center gap-3">
        <AccountIcon iconValue={account.iconValue} colorValue={account.colorValue} size="sm" />
        <span className="font-medium text-slate-900">{account.accountName}</span>
      </div>
    ),
  },
  {
    key: 'totalIncome',
    label: 'Income',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, account: EnrichedAccountData) => (
      <span className="text-emerald-600 font-medium">
        ${account.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'totalExpenses',
    label: 'Expenses',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, account: EnrichedAccountData) => (
      <span className="text-coral-600 font-medium">
        ${account.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'totalNet',
    label: 'Net',
    align: 'right',
    width: 'minmax(100px, 1fr)',
    render: (_, account: EnrichedAccountData) => {
      const net = account.totalNet;
      const isPositive = net >= 0;
      return (
        <span className={`font-medium ${isPositive ? 'text-emerald-600' : 'text-coral-600'}`}>
          {isPositive ? '+' : ''}${net.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    key: 'allTimeBalance',
    label: 'All Time Balance',
    align: 'right',
    width: 'minmax(120px, 1fr)',
    render: (_, account: EnrichedAccountData) => {
      const balance = account.allTimeBalance ?? 0;
      const isPositive = balance >= 0;
      return (
        <span className={`font-medium ${isPositive ? 'text-mist-600' : 'text-slate-500'}`}>
          {isPositive ? '+' : ''}${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    key: 'totalTransactions',
    label: 'Transactions',
    align: 'center',
    width: 'minmax(100px, 1fr)',
    render: (_, account: EnrichedAccountData) => <span className="text-slate-600">{account.totalTransactions}</span>,
  },
];

interface AccountsTableProps {
  data: EnrichedAccountData[];
  columns: ColumnDefinition<EnrichedAccountData>[];
}

/**
 * Table section for accounts breakdown showing detailed financial metrics
 */
export const AccountsTable: React.FC<AccountsTableProps> = ({ data, columns }) => (
  <Tile className="p-6">
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Account Details</h3>
        <p className="text-sm text-slate-600">Detailed financial metrics for each account in the selected period</p>
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
