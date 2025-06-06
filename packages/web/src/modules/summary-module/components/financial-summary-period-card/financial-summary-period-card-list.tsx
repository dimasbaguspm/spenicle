import dayjs from 'dayjs';
import React from 'react';

import { SkeletonCard } from '../../../../components/skeleton/skeleton';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';
import type { SummaryTransactionsPeriod } from '../../../../types/api';

import { DiffPill } from './diff-pill';
import { FinancialSummaryCard } from './financial-summary-card';

export interface FinancialSummaryCardConfig {
  label: string;
  amount: number;
  variant: 'coral' | 'sage' | 'mist' | 'slate' | 'success' | 'info' | 'warning' | 'danger';
  subLabel?: string;
  prefixAmount?: string;
  diff?: number;
}

// Always use current month and previous month
const getMonthRange = (date: dayjs.Dayjs) => {
  const start = date.startOf('month');
  const end = date.endOf('month');
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

export const FinancialSummaryPeriodCardList: React.FC = () => {
  const now = dayjs();
  const { startDate, endDate } = getMonthRange(now);
  const prevMonth = now.subtract(1, 'month');

  const { startDate: prevStartDate, endDate: prevEndDate } = getMonthRange(prevMonth);

  const [currentPeriods, , currentState] = useApiSummaryTransactionsQuery({ startDate, endDate });
  const [prevPeriods, , prevState] = useApiSummaryTransactionsQuery({ startDate: prevStartDate, endDate: prevEndDate });

  const current = currentPeriods ?? [];
  const prev = prevPeriods ?? [];

  const getTotals = (periods: SummaryTransactionsPeriod) => {
    const expenses = periods.reduce((sum, p) => sum + (p.totalExpenses ?? 0), 0);
    const income = periods.reduce((sum, p) => sum + (p.totalIncome ?? 0), 0);
    const net = periods.reduce((sum, p) => sum + (p.netAmount ?? 0), 0);
    return { expenses, income, net };
  };

  const { expenses: totalExpenses, income: totalIncome, net: totalNetAmount } = getTotals(current);
  const { expenses: prevExpenses, income: prevIncome, net: prevNetAmount } = getTotals(prev);

  // Calculate diffs
  const diffExpenses = totalExpenses - prevExpenses;
  const diffIncome = totalIncome - prevIncome;
  const diffNet = totalNetAmount - prevNetAmount;

  const summaryCards: FinancialSummaryCardConfig[] = [
    {
      label: 'Total Income',
      amount: totalIncome,
      variant: 'sage',
      subLabel: 'Income for this month',
      diff: diffIncome,
    },
    {
      label: 'Total Expenses',
      amount: totalExpenses,
      variant: 'coral',
      subLabel: 'Expenses for this month',
      diff: diffExpenses,
    },
    {
      label: 'Net Amount',
      amount: totalNetAmount,
      prefixAmount: totalNetAmount >= 0 ? '+' : '',
      variant: totalNetAmount >= 0 ? 'sage' : 'coral',
      subLabel: 'Net for this month',
      diff: diffNet,
    },
  ];

  if (currentState.isLoading || prevState.isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, idx) => (
          <SkeletonCard key={idx} className="p-6 min-h-[150px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {summaryCards.map((card, idx) => (
        <FinancialSummaryCard key={card.label + idx}>
          <FinancialSummaryCard.Label>{card.label}</FinancialSummaryCard.Label>
          <FinancialSummaryCard.Value amount={card.amount} prefix={card.prefixAmount} variant={card.variant} />
          <div className="flex justify-start items-center mt-1 min-h-0">
            <DiffPill diff={card.diff ?? 0} className="text-[10px] min-h-0 min-w-0" />
          </div>
          {card.subLabel && (
            <FinancialSummaryCard.SubLabel variant={card.variant}>{card.subLabel}</FinancialSummaryCard.SubLabel>
          )}
        </FinancialSummaryCard>
      ))}
    </div>
  );
};
