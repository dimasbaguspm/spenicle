import { type FC } from 'react';

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

  return (
    <>
      {/* table header */}
      <div className="grid grid-cols-12 gap-4 pb-3 border-b border-mist-200 text-sm font-medium text-slate-600">
        <div className="col-span-3">Amount</div>
        <div className="col-span-3">Description</div>
        <div className="col-span-3">Category</div>
        <div className="col-span-3">Account</div>
      </div>

      {/* table body */}
      <div className="space-y-2 mt-3">
        {transactions.map((seamlessTransaction) => {
          const { transaction: txn, account, category } = seamlessTransaction;

          // Extract metadata similar to TransactionCard
          const accountName = account?.name ?? 'Unknown Account';
          const accountIcon = account?.metadata?.icon ?? undefined;
          const accountColor = account?.metadata?.color ?? undefined;
          const categoryName = category?.name ?? 'Uncategorized';
          const categoryIcon = category?.metadata?.icon ?? undefined;
          const categoryColor = category?.metadata?.color ?? undefined;

          // Format amount using the same approach as TransactionCard
          const formattedAmount = formatAmount(Number(txn.amount ?? 0), {
            type: txn.type,
            showCurrency: false,
          });

          return (
            <div
              key={txn.id}
              className="grid grid-cols-12 gap-4 py-3 px-2 rounded-lg hover:bg-cream-50 cursor-pointer transition-colors items-center"
              onClick={() => onTransactionClick(seamlessTransaction)}
            >
              {/* Amount */}
              <div className="col-span-3">
                <span className={cn('font-bold text-sm', getAmountColor(txn.type))}>{formattedAmount}</span>
              </div>

              {/* Description */}
              <div className="col-span-3 flex items-center min-w-0">
                <span className="text-sm font-medium text-slate-900 truncate" title={txn.note ?? categoryName}>
                  {txn.note ?? categoryName}
                </span>
              </div>

              {/* Category */}
              <div className="col-span-3 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    <CategoryIcon
                      iconValue={categoryIcon}
                      colorValue={categoryColor}
                      size="xs"
                      aria-label={categoryName}
                    />
                  </div>
                  <span className="text-sm text-slate-600 truncate" title={categoryName}>
                    {categoryName}
                  </span>
                </div>
              </div>

              {/* Account */}
              <div className="col-span-3 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    <AccountIcon iconValue={accountIcon} colorValue={accountColor} size="xs" aria-label={accountName} />
                  </div>
                  <span className="text-sm text-slate-600 truncate" title={accountName}>
                    {accountName}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
