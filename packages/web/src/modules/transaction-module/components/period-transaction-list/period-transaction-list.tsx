import dayjs from 'dayjs';
import type { FC } from 'react';

import { BarChart } from '../../../../components';
import {
  useApiAccountsQuery,
  useApiCategoriesQuery,
  useApiSummaryTransactionsQuery,
  useApiTransactionsQuery,
} from '../../../../hooks';
import type { Transaction } from '../../../../types/api';
import { useTransactionFilters } from '../../hooks';
import { NoTransactionsCard } from '../transaction-card/no-transactions-card';
import { TransactionGroup } from '../transaction-card/transaction-group';

export interface PeriodTransactionListProps {
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
}

export const PeriodTransactionList: FC<PeriodTransactionListProps> = ({ startDate, endDate }) => {
  const filters = useTransactionFilters();

  const [summary] = useApiSummaryTransactionsQuery({
    startDate,
    endDate,
    accountId: String(filters.accountIds?.[0]),
    categoryId: String(filters.categoryIds?.[0]),
  });
  const [transactions] = useApiTransactionsQuery({
    startDate,
    endDate,
    accountIds: filters.accountIds,
    categoryIds: filters.categoryIds,
    types: filters.types,
  });

  const [accounts] = useApiAccountsQuery({ pageSize: 1000 });
  const [categories] = useApiCategoriesQuery({ pageSize: 1000 });

  const allAccounts = accounts?.items ?? [];
  const allCategories = categories?.items ?? [];

  // Generate all dates in the period to show even dates with no transactions
  const generateAllDatesInPeriod = (start: string, end: string): string[] => {
    const dates: string[] = [];
    let current = dayjs(start).startOf('day');
    const endOfPeriod = dayjs(end).startOf('day');

    while (current.isSameOrBefore(endOfPeriod, 'day')) {
      dates.push(current.toISOString());
      current = current.add(1, 'day');
    }

    return dates;
  };

  // Get all dates in period
  const allDatesInPeriod = generateAllDatesInPeriod(startDate, endDate);

  // Create a map of summary data by date for quick lookup
  const summaryByDate = (summary ?? []).reduce<Record<string, NonNullable<typeof summary>[0]>>((acc, item) => {
    const dateKey = dayjs(item.startDate).startOf('day').toISOString();
    acc[dateKey] = item;
    return acc;
  }, {});

  // Prepare bar chart data including all dates (with 0 values for missing dates)
  const barChartData = allDatesInPeriod.map((date) => {
    const summaryItem = summaryByDate[date];
    return {
      date,
      totalIncome: summaryItem?.totalIncome ?? 0,
      totalExpenses: Math.abs(summaryItem?.totalExpenses ?? 0),
      totalNet: summaryItem?.netAmount ?? 0,
    };
  });

  const transactionList: Transaction[] = transactions && Array.isArray(transactions.items) ? transactions.items : [];

  const transactionsByDate: Record<string, typeof transactionList> = {};
  transactionList.forEach((tx) => {
    const dateKey = dayjs(tx.date).startOf('day').toISOString();
    if (!transactionsByDate[dateKey]) transactionsByDate[dateKey] = [];
    transactionsByDate[dateKey].push(tx);
  });

  // Sort dates in descending order (most recent first)
  const sortedDateKeys = allDatesInPeriod.sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf());

  const isWeekly = dayjs(endDate).diff(dayjs(startDate), 'day') <= 7;

  const xAxisTickFormatter = (date: string) => {
    const d = dayjs(date);
    if (isWeekly) {
      return d.format('D MMM');
    }
    const endOfPeriod = d.endOf('week');
    return `${d.format('D MMM')} - ${endOfPeriod.format('D MMM')}`;
  };

  return (
    <div>
      <div className="mb-6">
        <BarChart
          data={barChartData}
          xKey="date"
          dataKey={['totalExpenses', 'totalIncome']}
          xAxisTickFormatter={xAxisTickFormatter}
        />
      </div>
      <div className="space-y-4 px-4 pb-[20vh]">
        {sortedDateKeys.length > 0 ? (
          sortedDateKeys.map((dateKey) => {
            const dateTransactions = transactionsByDate[dateKey] || [];
            return (
              <TransactionGroup
                key={dateKey}
                date={dayjs(dateKey)}
                selectedDate={dayjs(dateKey)}
                shouldScroll={false}
                transactions={dateTransactions.map((tx) => ({
                  transaction: tx,
                  category: allCategories.find((cat) => cat.id === tx.categoryId)!,
                  account: allAccounts.find((acc) => acc.id === tx.accountId)!,
                }))}
              />
            );
          })
        ) : (
          <NoTransactionsCard message="No transactions found for this period" />
        )}
      </div>
    </div>
  );
};
