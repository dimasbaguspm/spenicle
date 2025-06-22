import type { Dayjs } from 'dayjs';

import type { Transaction } from '../../../../types/api';

import { TransactionCalendarQuarterSlot } from './transaction-calendar-quarter-slot';
import type { TransactionCalendarItem } from './types';

interface TransactionCalendarDayViewRowProps {
  hour: number;
  date: Dayjs;
  transactions: TransactionCalendarItem[];
  onAddTransaction?: (date: Dayjs) => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

// helper to get items for a specific quarter
function getItemsForQuarter(items: TransactionCalendarItem[], quarter: number): TransactionCalendarItem[] {
  return items.filter((item) => {
    if (!item.transaction.date) return false;
    const minutes = new Date(item.transaction.date).getMinutes();
    return minutes >= quarter * 15 && minutes < (quarter + 1) * 15;
  });
}

export const TransactionCalendarDayViewRow = ({
  hour,
  date,
  transactions,
  onAddTransaction,
  onTransactionClick,
}: TransactionCalendarDayViewRowProps) => (
  <div className="border-b border-mist-200 group">
    <div className="flex">
      {/* Time label */}
      <div className="flex-shrink-0 w-20 p-4 border-r border-mist-200">
        <span className="text-sm text-slate-500 font-medium">
          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
        </span>
      </div>
      {/* 15-min slots vertically */}
      <div className="flex-1 grid grid-rows-4 hover:bg-slate-50 ">
        {[0, 1, 2, 3].map((quarter) => (
          <TransactionCalendarQuarterSlot
            key={quarter}
            date={date}
            hour={hour}
            quarter={quarter}
            transactions={getItemsForQuarter(transactions, quarter)}
            onAddTransaction={onAddTransaction}
            onTransactionClick={onTransactionClick}
          />
        ))}
      </div>
    </div>
  </div>
);
