import type { Dayjs } from 'dayjs';

import type { Transaction } from '../../../../types/api';

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
}: TransactionCalendarDayViewProps) => (
  <div className="min-h-full">
    <div className="sticky top-0 z-10 bg-white border-b border-mist-200 pb-4">
      <h3 className="text-center text-lg font-medium text-slate-700">{currentDate.format('dddd, MMMM D')}</h3>
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
