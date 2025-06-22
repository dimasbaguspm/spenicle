import dayjs, { type Dayjs } from 'dayjs';
import { useState, type FC, useMemo } from 'react';

import type { Account, Category, Transaction } from '../../../../types/api';

import { CalendarCurrentTimeLine } from './calendar-current-time-line';
import { TransactionCalendarDayView } from './transaction-calendar-day-view';
import { TransactionCalendarWeekView } from './transaction-calendar-week-view';
import type { TransactionCalendarItem } from './types';

export interface TransactionCalendarProps {
  selectedDate: Dayjs;
  onDateSelect?: (date: Dayjs) => void;
  onAddTransaction?: (date: Dayjs) => void;
  onTransactionClick?: (transaction: Transaction) => void;
  data: Transaction[];
  accounts: Account[];
  categories: Category[];
}

// map transactions to TransactionCalendarItem with account/category lookup
function mapToCalendarItems(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): TransactionCalendarItem[] {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  return transactions
    .map((transaction) => {
      const account = transaction.accountId ? accountMap.get(transaction.accountId) : undefined;
      const category = transaction.categoryId ? categoryMap.get(transaction.categoryId) : undefined;
      if (!account || !category) return null;
      return { transaction, account, category };
    })
    .filter(Boolean) as TransactionCalendarItem[];
}

export const TransactionCalendar: FC<TransactionCalendarProps> = ({
  selectedDate = dayjs(),
  onDateSelect,
  onAddTransaction,
  onTransactionClick,
  data,
  accounts = [],
  categories = [],
}) => {
  const [viewMode] = useState<'week' | 'day'>('day');

  // memoize enriched items for performance
  const calendarItems = useMemo(() => mapToCalendarItems(data, accounts, categories), [data, accounts, categories]);

  // generate hours for the day view
  const generateHours = () => Array.from({ length: 24 }, (_, i) => i);
  // generate days for the week view
  const generateWeekDays = () => {
    const weekStart = selectedDate.startOf('week');
    return Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day'));
  };

  // get calendar items for a specific date and hour
  const getItemsForSlot = (date: Dayjs, hour?: number) => {
    return calendarItems.filter(({ transaction }) => {
      const txDate = dayjs(transaction.date);
      if (hour !== undefined) {
        return txDate.isSame(date, 'day') && txDate.hour() === hour;
      }
      return txDate.isSame(date, 'day');
    });
  };

  const hours = generateHours();
  const weekDays = generateWeekDays();

  return (
    <div className="flex flex-col bg-white">
      <div className="flex-1 overflow-auto relative">
        <CalendarCurrentTimeLine currentDate={selectedDate} viewMode={viewMode} />
        {viewMode === 'week' ? (
          <TransactionCalendarWeekView
            weekDays={weekDays}
            hours={hours}
            selectedDate={selectedDate}
            getItemsForSlot={getItemsForSlot}
            onDateSelect={onDateSelect}
            onAddTransaction={onAddTransaction}
            onTransactionClick={onTransactionClick}
          />
        ) : (
          <TransactionCalendarDayView
            currentDate={selectedDate}
            hours={hours}
            getItemsForSlot={getItemsForSlot}
            onAddTransaction={onAddTransaction}
            onTransactionClick={onTransactionClick}
          />
        )}
      </div>
    </div>
  );
};
