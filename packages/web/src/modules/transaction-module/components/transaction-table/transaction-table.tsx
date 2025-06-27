import { type FC } from 'react';

import { DataTable, type ColumnDefinition } from '../../../../components';
import { formatAmount } from '../../../../libs/format-amount';
import { cn } from '../../../../libs/utils';
import { AccountIcon } from '../../../account-module/components/account-icon/account-icon';
import { CategoryIcon } from '../../../category-module/components/category-icon/category-icon';
import type { SeamlessTransaction } from '../../hooks/use-seamless-transactions/types';

interface TransactionTableProps {
  transactions: SeamlessTransaction[];
  onTransactionClick: (transaction: SeamlessTransaction) => void;
}

export const TransactionTable: FC<TransactionTableProps> = ({ transactions, onTransactionClick }) => {
  const getAmountColor = (type?: string) => {
    switch (type) {
      case 'income':
        return 'text-success-600';
      case 'expense':
        return 'text-danger-600';
      default:
        return 'text-info-600';
    }
  };

  // Create a clickable wrapper for each column that triggers the row click
  const createClickableColumn = (
    baseRender: (
      value: SeamlessTransaction[keyof SeamlessTransaction],
      row: SeamlessTransaction,
      index: number
    ) => React.ReactNode
  ) => {
    return (value: SeamlessTransaction[keyof SeamlessTransaction], row: SeamlessTransaction, index: number) => (
      <div className="w-full h-full cursor-pointer" onClick={() => onTransactionClick(row)}>
        {baseRender(value, row, index)}
      </div>
    );
  };

  // Define table columns with custom renderers
  const columns: ColumnDefinition<SeamlessTransaction>[] = [
    {
      key: 'transaction' as keyof SeamlessTransaction,
      label: 'Amount',
      align: 'left',
      gridColumn: 'span 3',
      render: createClickableColumn((_, seamlessTransaction) => {
        const { transaction: txn } = seamlessTransaction;
        const formattedAmount = formatAmount(Number(txn.amount ?? 0), {
          type: txn.type,
        });
        return <span className={cn('font-bold text-sm', getAmountColor(txn.type))}>{formattedAmount}</span>;
      }),
    },
    {
      key: 'transaction' as keyof SeamlessTransaction,
      label: 'Description',
      align: 'left',
      gridColumn: 'span 3',
      render: createClickableColumn((_, seamlessTransaction) => {
        const { transaction: txn, category } = seamlessTransaction;
        const categoryName = category?.name ?? 'Uncategorized';
        return (
          <div className="flex items-center min-w-0">
            <span className="text-sm font-medium text-slate-900 truncate" title={txn.note ?? categoryName}>
              {txn.note ?? categoryName}
            </span>
          </div>
        );
      }),
    },
    {
      key: 'category' as keyof SeamlessTransaction,
      label: 'Category',
      align: 'left',
      gridColumn: 'span 3',
      render: createClickableColumn((_, seamlessTransaction) => {
        const { category } = seamlessTransaction;
        const categoryName = category?.name ?? 'Uncategorized';
        const categoryIcon = category?.metadata?.icon ?? undefined;
        const categoryColor = category?.metadata?.color ?? undefined;

        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0">
              <CategoryIcon iconValue={categoryIcon} colorValue={categoryColor} size="xs" aria-label={categoryName} />
            </div>
            <span className="text-sm text-slate-600 truncate" title={categoryName}>
              {categoryName}
            </span>
          </div>
        );
      }),
    },
    {
      key: 'account' as keyof SeamlessTransaction,
      label: 'Account',
      align: 'left',
      gridColumn: 'span 3',
      render: createClickableColumn((_, seamlessTransaction) => {
        const { account } = seamlessTransaction;
        const accountName = account?.name ?? 'Unknown Account';
        const accountIcon = account?.metadata?.icon ?? undefined;
        const accountColor = account?.metadata?.color ?? undefined;

        return (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0">
              <AccountIcon iconValue={accountIcon} colorValue={accountColor} size="xs" aria-label={accountName} />
            </div>
            <span className="text-sm text-slate-600 truncate" title={accountName}>
              {accountName}
            </span>
          </div>
        );
      }),
    },
  ];

  return (
    <DataTable
      data={transactions}
      columns={columns}
      emptyMessage="No transactions found"
      emptyDescription="Start adding transactions to see them here"
      rowClassName={(_row, index) =>
        `transition-colors hover:bg-cream-50 ${index % 2 === 0 ? 'bg-white' : 'bg-cream-25'}`
      }
    />
  );
};
