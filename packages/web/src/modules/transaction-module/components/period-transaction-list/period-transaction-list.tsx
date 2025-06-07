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
import { NoTransactionsCard } from '../transaction-card/no-transactions-card';
import { TransactionGroup } from '../transaction-card/transaction-group';

export interface PeriodTransactionListProps {
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
}

export const PeriodTransactionList: FC<PeriodTransactionListProps> = ({ startDate, endDate }) => {
  // Fetch summary for BarChart
  const [summary] = useApiSummaryTransactionsQuery({ startDate, endDate });
  // Fetch transaction details
  const [transactions] = useApiTransactionsQuery({ startDate, endDate });
  const [accounts] = useApiAccountsQuery({ pageSize: 1000 }); // Fetch accounts, not used directly but may be needed for context
  const [categories] = useApiCategoriesQuery({ pageSize: 1000 }); // Fetch categories, not used directly but may be needed for context

  const allAccounts = accounts?.items ?? [];
  const allCategories = categories?.items ?? [];

  // Prepare bar chart data
  const barChartData = (summary ?? [])
    .map((item) => ({
      date: item.startDate,
      totalIncome: item.totalIncome ?? 0,
      totalExpenses: Math.abs(item.totalExpenses ?? 0),
      totalNet: item.netAmount ?? 0,
    }))
    .filter((item) => {
      const itemDate = dayjs(item.date);
      return itemDate.isSameOrAfter(dayjs(startDate), 'day') && itemDate.isSameOrBefore(dayjs(endDate), 'day');
    });

  // Extract transaction list if paged
  const transactionList: Transaction[] = transactions && Array.isArray(transactions.items) ? transactions.items : [];

  // Group transactions by date (YYYY-MM-DD)
  const transactionsByDate: Record<string, typeof transactionList> = {};
  transactionList.forEach((tx) => {
    const dateKey = dayjs(tx.date).startOf('day').toISOString();
    if (!transactionsByDate[dateKey]) transactionsByDate[dateKey] = [];
    transactionsByDate[dateKey].push(tx);
  });

  // Sort date keys descending (latest first)
  const sortedDateKeys = Object.keys(transactionsByDate).sort((a, b) => dayjs(b).valueOf() - dayjs(a).valueOf());

  // Determine if the period is a week
  const isWeekly = dayjs(endDate).diff(dayjs(startDate), 'day') <= 7;

  // Custom formatter for x-axis ticks
  const xAxisTickFormatter = (date: string) => {
    const d = dayjs(date);
    if (isWeekly) {
      return d.format('D MMM'); // e.g., '7 Jun'
    }
    // For longer periods, show range (start - end of period)
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
          sortedDateKeys.map((dateKey) => (
            <TransactionGroup
              key={dateKey}
              date={dayjs(dateKey)}
              selectedDate={dayjs(dateKey)}
              shouldScroll={false}
              transactions={transactionsByDate[dateKey].map((tx) => ({
                transaction: tx,
                category: allCategories.find((cat) => cat.id === tx.categoryId)!,
                account: allAccounts.find((acc) => acc.id === tx.accountId)!,
              }))}
            />
          ))
        ) : (
          <NoTransactionsCard message="No transactions found for this period." />
        )}
      </div>
    </div>
  );
};
