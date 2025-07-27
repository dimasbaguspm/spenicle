import { Text, type TextProps } from '@dimasbaguspm/versaur/primitive';
import dayjs from 'dayjs';
import { Edit } from 'lucide-react';
import { type FC } from 'react';

import { DataTable, IconButton, type ColumnDefinition, type SortConfig } from '../../../../components';
import { formatAmount } from '../../../../libs/format-amount';
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
  const getAmountColor = (type?: string): TextProps['color'] => {
    switch (type) {
      case 'income':
        return 'secondary';
      case 'expense':
        return 'primary';
      default:
        return 'tertiary';
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
          hidePrefix: true,
        });

        return (
          <Text fontWeight="bold" fontSize="sm" color={getAmountColor(txn.type)}>
            {formattedAmount}
          </Text>
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
            <Text as="span" fontSize="sm" fontWeight="medium">
              {categoryName}
            </Text>
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
              <Text as="span" fontSize="sm" fontWeight="medium">
                {accountName}
              </Text>
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
          <Text fontSize="sm" fontWeight="medium">
            {timeDisplay}
          </Text>
        );
      }),
    },
    {
      key: 'id' as keyof SeamlessTransaction,
      label: 'Actions',
      align: 'center',
      sortable: false,
      render: (_, seamlessTransaction) => (
        <IconButton
          variant="slate-ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onTransactionEdit?.(seamlessTransaction);
          }}
          title="Edit transaction"
        >
          <Edit className="h-4 w-4" />
        </IconButton>
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
