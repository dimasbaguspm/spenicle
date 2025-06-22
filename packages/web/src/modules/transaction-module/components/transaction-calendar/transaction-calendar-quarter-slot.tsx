import type { Dayjs } from 'dayjs';

import { cn } from '../../../../libs/utils';
import type { Transaction } from '../../../../types/api';

import { TransactionSlotItem } from './transaction-slot-item';
import type { TransactionCalendarItem } from './types';

interface TransactionCalendarQuarterSlotProps {
  date: Dayjs;
  hour: number;
  quarter: number; // 0, 1, 2, 3
  transactions: TransactionCalendarItem[];
  onAddTransaction?: (date: Dayjs) => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

export const TransactionCalendarQuarterSlot = ({
  date,
  hour,
  quarter,
  transactions,
  onAddTransaction,
  onTransactionClick,
}: TransactionCalendarQuarterSlotProps) => {
  // determine how many to show before 'More'
  const maxVisible = 4;
  const showMore = transactions.length > maxVisible;
  const visibleTransactions = showMore ? transactions.slice(0, maxVisible) : transactions;
  // width logic: 1 = full, 2 = 1/2, 3 = 1/3, 4+ = 1/4
  let widthClass = '';
  if (visibleTransactions.length === 1) {
    widthClass = 'flex-1';
  } else if (visibleTransactions.length === 2) {
    widthClass = 'basis-1/2';
  } else if (visibleTransactions.length === 3) {
    widthClass = 'basis-1/3';
  } else {
    widthClass = 'basis-1/4';
  }

  return (
    <div
      className={cn(
        'flex-1 min-w-0 border-l border-mist-100 cursor-pointer group relative h-5 pr-4',
        quarter < 3 ? 'mb-1 border-b border-mist-100' : '' // add vertical spacing and divider except last quarter
      )}
      data-quarter-index={hour * 4 + quarter}
      onClick={() => {
        // set hour and quarter in date
        const slotDate = date
          .hour(hour)
          .minute(quarter * 15)
          .second(0)
          .millisecond(0);
        onAddTransaction?.(slotDate);
      }}
    >
      {/* items horizontal list with 'More' as last item if needed */}
      <div className="flex flex-row items-center gap-1">
        {visibleTransactions.map((item) => (
          <div key={item.transaction.id} className={widthClass + ' min-w-0'}>
            <TransactionSlotItem data={item} onTransactionClick={onTransactionClick} />
          </div>
        ))}
        {showMore && (
          <div
            key="more"
            className="text-xs px-2 py-1 rounded-full bg-coral-600 text-cream-50 font-medium cursor-pointer select-none ml-auto"
            title={`Show ${transactions.length - maxVisible} more transactions`}
          >
            More
          </div>
        )}
      </div>
    </div>
  );
};
