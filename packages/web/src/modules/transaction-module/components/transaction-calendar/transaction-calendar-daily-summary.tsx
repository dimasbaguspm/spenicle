import type { Dayjs } from 'dayjs';
import { useMemo } from 'react';

import { formatAmount } from '../../../../libs/format-amount';

import type { TransactionCalendarItem } from './types';

interface TransactionCalendarDailySummaryProps {
  currentDate: Dayjs;
  hours: number[];
  getItemsForSlot: (date: Dayjs, hour: number) => TransactionCalendarItem[];
}

interface DailyTotals {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
}

/**
 * Hook to calculate daily totals from all transactions for a given date
 */
const useDailyTotals = (
  currentDate: Dayjs,
  hours: number[],
  getItemsForSlot: (date: Dayjs, hour: number) => TransactionCalendarItem[]
): DailyTotals => {
  return useMemo(() => {
    // get all transactions for the day across all hours
    const allDayTransactions = hours.reduce<TransactionCalendarItem[]>((acc, hour) => {
      return acc.concat(getItemsForSlot(currentDate, hour));
    }, []);

    // calculate totals following the same pattern as other components
    const totalIncome = allDayTransactions.reduce((sum, { transaction }) => {
      return transaction.type === 'income' ? sum + Math.abs(transaction.amount ?? 0) : sum;
    }, 0);

    const totalExpenses = allDayTransactions.reduce((sum, { transaction }) => {
      return transaction.type === 'expense' ? sum + Math.abs(transaction.amount ?? 0) : sum;
    }, 0);

    const netAmount = totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netAmount };
  }, [currentDate, hours, getItemsForSlot]);
};

/**
 * TransactionCalendarDailySummary displays daily financial totals in a grid layout.
 * Shows Income (sage), Expenses (coral), and Net Amount with dynamic coloring.
 * Follows the color palette and formatting standards defined in the design system.
 */
export const TransactionCalendarDailySummary = ({
  currentDate,
  hours,
  getItemsForSlot,
}: TransactionCalendarDailySummaryProps) => {
  const dailyTotals = useDailyTotals(currentDate, hours, getItemsForSlot);

  return (
    <div className="grid grid-cols-3 gap-4 text-sm mb-4">
      <div className="text-center">
        <p className="text-slate-500 font-medium mb-1">Income</p>
        <p className="font-semibold text-sage-600 tabular-nums">
          {formatAmount(dailyTotals.totalIncome, {
            type: 'income',
            compact: true,
          })}
        </p>
      </div>
      <div className="text-center">
        <p className="text-slate-500 font-medium mb-1">Expenses</p>
        <p className="font-semibold text-coral-600 tabular-nums">
          {formatAmount(dailyTotals.totalExpenses, {
            type: 'expense',
            compact: true,
          })}
        </p>
      </div>
      <div className="text-center">
        <p className="text-slate-500 font-medium mb-1">Net Amount</p>
        <p className={`font-semibold tabular-nums ${dailyTotals.netAmount >= 0 ? 'text-sage-600' : 'text-coral-600'}`}>
          {formatAmount(dailyTotals.netAmount, {
            type: dailyTotals.netAmount >= 0 ? 'income' : 'expense',
            compact: true,
          })}
        </p>
      </div>
    </div>
  );
};
