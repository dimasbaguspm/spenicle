import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { formatAmount as formatAmountLib } from '../../../../libs/format-amount';
import { cn } from '../../../../libs/utils';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';
import { AccountIcon } from '../../../account-module/components/account-icon/account-icon';
import { CategoryIcon } from '../../../category-module/components/category-icon/category-icon';
import type { SeamlessTransaction } from '../../hooks/use-seamless-transactions/types';

import { formatTime } from './helpers';

export interface TransactionCardProps {
  transaction: SeamlessTransaction;
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const { openDrawer } = useDrawerRouterProvider();
  const { transaction: txn, account, category } = transaction;

  // Extract account and category icon/color from metadata
  const accountName = account?.name ?? 'Account';
  const accountIcon = account?.metadata?.icon ?? undefined;
  const accountColor = account?.metadata?.color ?? undefined;
  const categoryName = category?.name ?? 'Category';
  const categoryIcon = category?.metadata?.icon ?? undefined;
  const categoryColor = category?.metadata?.color ?? undefined;

  const handleOnClick = async () => {
    if (txn.id) {
      await openDrawer(DRAWER_IDS.EDIT_TRANSACTION, { transactionId: +txn.id });
    }
  };

  // Color for amount
  const amountColor =
    txn.type === 'income' ? 'text-success-600' : txn.type === 'expense' ? 'text-danger-600' : 'text-info-600';

  // Format date for display, fallback to empty string if missing
  const formattedTime = txn.date ? formatTime(new Date(txn.date)) : '';

  // Use new formatAmount helper
  const formattedAmount = formatAmountLib(Number(txn.amount ?? 0), {
    type: txn.type,
    compact: false, // set true if you want compact
    showCurrency: false, // set true if you want currency
  });

  return (
    <button
      type="button"
      className={cn(
        'w-full text-left p-4 transition hover:bg-cream-50',
        'min-h-[88px] md:min-h-[96px] flex items-center' // flex-row by default
      )}
      aria-label={`Edit transaction: ${categoryName} ${formattedAmount}`}
      onClick={handleOnClick}
    >
      {/* Grid layout: 3 columns, always horizontal */}
      <div className="grid grid-cols-12 gap-x-3 items-center w-full min-h-[80px]">
        {/* Left column: CategoryIcon (top), AccountIcon (bottom) */}
        <div className="col-span-1 flex flex-col items-center justify-between h-full">
          <CategoryIcon
            iconValue={categoryIcon}
            colorValue={categoryColor}
            size="sm"
            aria-label={categoryName}
            className="mt-1"
          />
          <AccountIcon iconValue={accountIcon} colorValue={accountColor} size="xs" aria-label={accountName} />
        </div>
        {/* Middle column: labels and account name */}
        <div className="col-span-7 flex flex-col justify-between h-full ml-2">
          <div className="flex flex-col">
            {txn.note ? (
              <>
                <span
                  className="text-base font-medium text-slate-900 truncate max-w-full whitespace-nowrap"
                  title={txn.note.length > 50 ? txn.note : undefined}
                >
                  {txn.note.length > 50 ? `${txn.note.slice(0, 50)}...` : txn.note}
                </span>
                <span className="text-xs text-slate-500 truncate whitespace-nowrap" title={categoryName}>
                  {categoryName}
                </span>
              </>
            ) : (
              <span className="text-base font-medium text-slate-900 truncate whitespace-nowrap" title={categoryName}>
                {categoryName}
              </span>
            )}
          </div>
          <span className="text-sm text-slate-500 truncate mb-1 whitespace-nowrap" title={accountName}>
            {accountName}
          </span>
        </div>
        {/* Right column: amount (top), time (bottom) */}
        <div className="col-span-4 flex flex-col items-end justify-between h-full">
          <span className={cn('font-bold text-lg', amountColor)}>{formattedAmount}</span>
          <span className="text-sm text-slate-400 mb-1">{formattedTime}</span>
        </div>
      </div>
    </button>
  );
}
