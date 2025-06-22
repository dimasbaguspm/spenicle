import type { Dayjs } from 'dayjs';

import type { Transaction } from '../../../../types/api';

import { TransactionCalendarDayColumn } from './transaction-calendar-day-column';
import { TransactionCalendarTimeLabels } from './transaction-calendar-time-labels';
import { TransactionCalendarWeekHeader } from './transaction-calendar-week-header';
import type { TransactionCalendarItem } from './types';

interface TransactionCalendarWeekViewProps {
  weekDays: Dayjs[];
  hours: number[];
  selectedDate: Dayjs;
  getItemsForSlot: (date: Dayjs, hour: number) => TransactionCalendarItem[];
  onDateSelect?: (date: Dayjs) => void;
  onAddTransaction?: (date: Dayjs, hour: number) => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

export const TransactionCalendarWeekView = ({
  weekDays,
  hours,
  selectedDate,
  getItemsForSlot,
  onDateSelect,
  onAddTransaction,
  onTransactionClick,
}: TransactionCalendarWeekViewProps) => (
  <div className="min-h-full">
    <TransactionCalendarWeekHeader weekDays={weekDays} selectedDate={selectedDate} onDateSelect={onDateSelect} />
    <div className="grid grid-cols-8">
      <TransactionCalendarTimeLabels hours={hours} />
      {weekDays.map((day) => (
        <TransactionCalendarDayColumn
          key={day.format('YYYY-MM-DD')}
          day={day}
          hours={hours}
          getItemsForSlot={getItemsForSlot}
          onAddTransaction={onAddTransaction}
          onTransactionClick={onTransactionClick}
        />
      ))}
    </div>
  </div>
);
