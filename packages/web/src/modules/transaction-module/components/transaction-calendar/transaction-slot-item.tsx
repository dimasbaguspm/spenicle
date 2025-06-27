import React from 'react';

import { formatAmount } from '../../../../libs/format-amount';
import { cn } from '../../../../libs/utils';
import type { Transaction } from '../../../../types/api';
import { CATEGORY_COLORS } from '../../../category-module/components/category-icon/constants';

import type { TransactionCalendarItem } from './types';

interface TransactionSlotItemProps {
  data: TransactionCalendarItem;
  onTransactionClick?: (transaction: Transaction) => void;
}

// presentational component for a transaction slot item
export const TransactionSlotItem: React.FC<TransactionSlotItemProps> = ({
  data: { transaction, category },
  onTransactionClick,
}) => {
  const color = category.metadata?.color as string;
  const selectedColor = CATEGORY_COLORS.find(({ value }) => value === color);
  const isOutlineVariant = selectedColor?.value?.includes('-outline') ?? false;
  const iconTextColor = isOutlineVariant ? 'text-current' : 'text-white';

  // fallback to 0 if amount is undefined
  const amount = formatAmount(transaction.amount ?? 0, { type: transaction.type, compact: false });
  const hasNote = Boolean(transaction.note);
  const displayText = hasNote ? `${amount} - ${transaction.note}` : amount;

  return (
    <div
      className={cn('rounded', selectedColor?.color, iconTextColor, 'truncate h-5 text-[12px] px-2')}
      title={transaction?.note ?? ''}
      aria-label={displayText}
      onClick={
        onTransactionClick
          ? (e) => {
              e.stopPropagation();
              onTransactionClick(transaction);
            }
          : undefined
      }
      role={onTransactionClick ? 'button' : undefined}
      tabIndex={onTransactionClick ? 0 : undefined}
      style={onTransactionClick ? { cursor: 'pointer' } : undefined}
    >
      {displayText}
    </div>
  );
};
