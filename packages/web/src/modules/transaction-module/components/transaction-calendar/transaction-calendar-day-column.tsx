import type { Dayjs } from 'dayjs';

import type { Transaction } from '../../../../types/api';

import { TransactionCalendarTransactionSlot } from './transaction-calendar-transaction-slot';
import type { TransactionCalendarItem } from './types';

interface TransactionCalendarDayColumnProps {
  day: Dayjs;
  hours: number[];
  getItemsForSlot: (date: Dayjs, hour: number) => TransactionCalendarItem[];
  onAddTransaction?: (date: Dayjs, hour: number) => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

export const TransactionCalendarDayColumn = ({
  day,
  hours,
  getItemsForSlot,
  onAddTransaction,
  onTransactionClick,
}: TransactionCalendarDayColumnProps) => (
  <div className="border-r border-mist-200">
    {hours.map((hour) => (
      <TransactionCalendarTransactionSlot
        key={hour}
        date={day}
        hour={hour}
        transactions={getItemsForSlot(day, hour)}
        onAddTransaction={onAddTransaction}
        onTransactionClick={onTransactionClick}
      />
    ))}
  </div>
);
