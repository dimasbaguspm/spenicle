import dayjs from 'dayjs';
import React from 'react';

import { SkeletonCard } from '../../../../components/skeleton/skeleton';
import { useApiSummaryTransactionsQuery } from '../../../../hooks';

import { FinancialSummaryCard } from './financial-summary-card';

export interface FinancialSummaryCardConfig {
  label: string;
  amount: number;
  variant: 'coral' | 'sage' | 'mist' | 'slate' | 'success' | 'info' | 'warning' | 'danger';
  subLabel?: string;
  prefixAmount?: string;
}

export interface FinancialSummaryPeriodCardListProps {
  selectedPeriod: string;
}

const getPeriodRange = (period: string) => {
  const now = dayjs();
  switch (period) {
    case 'this-week': {
      const start = now.startOf('week');
      const end = now.endOf('week');
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'last-week': {
      const lastWeek = now.subtract(1, 'week');
      const start = lastWeek.startOf('week');
      const end = lastWeek.endOf('week');
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'last-month': {
      const lastMonth = now.subtract(1, 'month');
      const start = lastMonth.startOf('month');
      const end = lastMonth.endOf('month');
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'this-year': {
      const start = now.startOf('year');
      const end = now.endOf('year');
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    case 'this-month':
    default: {
      const start = now.startOf('month');
      const end = now.endOf('month');
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
  }
};

export const FinancialSummaryPeriodCardList: React.FC<FinancialSummaryPeriodCardListProps> = ({ selectedPeriod }) => {
  const { startDate, endDate } = getPeriodRange(selectedPeriod);
  const [summaryPeriods, , state] = useApiSummaryTransactionsQuery({ startDate, endDate });
  const periods = summaryPeriods ?? [];

  const totalExpenses = periods.reduce((sum, period) => sum + (period.totalExpenses ?? 0), 0);
  const totalIncome = periods.reduce((sum, period) => sum + (period.totalIncome ?? 0), 0);
  const netAmount = totalIncome - totalExpenses;

  const summaryCards: FinancialSummaryCardConfig[] = [
    {
      label: 'Total Expenses',
      amount: totalExpenses,
      variant: 'coral',
      subLabel: 'Expenses for selected period',
    },
    {
      label: 'Total Income',
      amount: totalIncome,
      variant: 'sage',
      subLabel: 'Income for selected period',
    },
    {
      label: 'Net Amount',
      amount: netAmount,
      prefixAmount: netAmount >= 0 ? '+' : '',
      variant: netAmount >= 0 ? 'sage' : 'coral',
      subLabel: 'Net for selected period',
    },
  ];

  if (state.isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, idx) => (
          <SkeletonCard key={idx} size="4xl" />
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
          {card.subLabel && (
            <FinancialSummaryCard.SubLabel variant={card.variant}>{card.subLabel}</FinancialSummaryCard.SubLabel>
          )}
        </FinancialSummaryCard>
      ))}
    </div>
  );
};
