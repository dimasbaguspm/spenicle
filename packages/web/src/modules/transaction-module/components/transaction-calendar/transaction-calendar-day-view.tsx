import type { Dayjs } from 'dayjs';

import type { Transaction } from '../../../../types/api';

import { TransactionCalendarDailySummary } from './transaction-calendar-daily-summary';
import { TransactionCalendarDayViewRow } from './transaction-calendar-day-view-row';
import type { TransactionCalendarItem } from './types';

interface TransactionCalendarDayViewProps {
  currentDate: Dayjs;
  hours: number[];
  getItemsForSlot: (date: Dayjs, hour: number) => TransactionCalendarItem[];
  onAddTransaction?: (date: Dayjs) => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

export const TransactionCalendarDayView = ({
  currentDate,
  hours,
  getItemsForSlot,
  onAddTransaction,
  onTransactionClick,
}: TransactionCalendarDayViewProps) => {
  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-10 bg-white border-b border-mist-200 pb-4 px-4 pt-4">
        <TransactionCalendarDailySummary currentDate={currentDate} hours={hours} getItemsForSlot={getItemsForSlot} />
      </div>
      <div className="grid grid-cols-1">
        {hours.map((hour) => (
          <TransactionCalendarDayViewRow
            key={hour}
            hour={hour}
            date={currentDate}
            transactions={getItemsForSlot(currentDate, hour)}
            onAddTransaction={onAddTransaction}
            onTransactionClick={onTransactionClick}
          />
        ))}
      </div>
    </div>
  );
};
