import dayjs from 'dayjs';
import { Edit } from 'lucide-react';
import { type FC } from 'react';

import { DataTable, IconButton, type ColumnDefinition, type SortConfig } from '../../../../components';
import { formatAmount } from '../../../../libs/format-amount';
import { cn } from '../../../../libs/utils';
import { AccountIcon } from '../../../account-module/components/account-icon/account-icon';
import { CategoryIcon } from '../../../category-module/components/category-icon/category-icon';
import type { SeamlessTransaction } from '../../hooks/use-seamless-transactions/types';

interface TransactionTableProps {
  transactions: SeamlessTransaction[];
  onTransactionClick: (transaction: SeamlessTransaction) => void;
  onTransactionEdit?: (transaction: SeamlessTransaction) => void;
  sortConfig?: SortConfig<SeamlessTransaction>;
  onSort?: (field: keyof SeamlessTransaction) => void;
}

export const TransactionTable: FC<TransactionTableProps> = ({
  transactions,
  onTransactionClick,
  onTransactionEdit,
  sortConfig,
  onSort,
}) => {
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

  // Define table columns with enhanced desktop layout
  const columns: ColumnDefinition<SeamlessTransaction>[] = [
    {
      key: 'transaction' as keyof SeamlessTransaction,
      label: 'Amount',
      align: 'right',
      width: '150px',
      sortable: true,
      render: createClickableColumn((_, seamlessTransaction) => {
        const { transaction: txn } = seamlessTransaction;
        const formattedAmount = formatAmount(Number(txn.amount ?? 0), {
          type: txn.type,
          compact: true,
        });
        return (
          <span className={cn('font-bold text-sm tabular-nums', getAmountColor(txn.type))}>{formattedAmount}</span>
        );
      }),
    },
    {
      key: 'category' as keyof SeamlessTransaction,
      label: 'Category',
      align: 'left',
      width: '250px',
      sortable: true,
      render: createClickableColumn((_, seamlessTransaction) => {
        const { category } = seamlessTransaction;
        const categoryName = category?.name ?? 'Uncategorized';
        const categoryIcon = category?.metadata?.icon ?? undefined;
        const categoryColor = category?.metadata?.color ?? undefined;

        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <CategoryIcon iconValue={categoryIcon} colorValue={categoryColor} size="sm" aria-label={categoryName} />
            </div>
            <span className="text-sm font-medium text-slate-700 truncate" title={categoryName}>
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
      sortable: true,
      width: '250px',
      render: createClickableColumn((_, seamlessTransaction) => {
        const { account } = seamlessTransaction;
        const accountName = account?.name ?? 'Unknown Account';
        const accountIcon = account?.metadata?.icon ?? undefined;
        const accountColor = account?.metadata?.color ?? undefined;

        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0">
              <AccountIcon iconValue={accountIcon} colorValue={accountColor} size="sm" aria-label={accountName} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-700 truncate" title={accountName}>
                {accountName}
              </p>
              {account?.metadata?.bankName && (
                <p className="text-xs text-slate-500 truncate" title={account.metadata.bankName as string}>
                  {account.metadata.bankName as string}
                </p>
              )}
            </div>
          </div>
        );
      }),
    },
    {
      key: 'time' as keyof SeamlessTransaction,
      label: 'Time',
      align: 'center',
      width: '80px',
      sortable: true,
      render: createClickableColumn((_, seamlessTransaction) => {
        const { transaction: txn } = seamlessTransaction;
        const timeDisplay = txn.date ? dayjs(txn.date).format('HH:mm') : '--:--';
        return (
          <span className="text-sm font-medium text-slate-600 tabular-nums" title={txn.date ?? 'No time available'}>
            {timeDisplay}
          </span>
        );
      }),
    },
    {
      key: 'id' as keyof SeamlessTransaction,
      label: 'Actions',
      align: 'center',
      sortable: false,
      render: (_, seamlessTransaction) => (
        <div className="flex items-center justify-center gap-2">
          {onTransactionEdit && (
            <IconButton
              variant="slate-ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTransactionEdit(seamlessTransaction);
              }}
              title="Edit transaction"
            >
              <Edit className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={transactions}
      columns={columns}
      sortConfig={sortConfig}
      onSort={onSort}
      emptyMessage="No transactions found"
      emptyDescription="Start adding transactions to see them here"
      rowClassName={(_row, index) =>
        `transition-colors hover:bg-cream-50 ${index % 2 === 0 ? 'bg-white' : 'bg-cream-25'}`
      }
    />
  );
};
