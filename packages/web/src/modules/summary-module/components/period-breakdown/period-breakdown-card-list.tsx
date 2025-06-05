import React from 'react';

import type { SummaryTransactionsPeriod } from '../../../../types/api';

import { PeriodBreakdownCard } from './period-breakdown-card';

interface PeriodBreakdownCardListProps {
  periods: SummaryTransactionsPeriod;
  periodType: 'weekly' | 'monthly';
  onPeriodClick?: (period: SummaryTransactionsPeriod[number], idx: number) => void;
}

export const PeriodBreakdownCardList: React.FC<PeriodBreakdownCardListProps> = ({
  periods,
  periodType,
  onPeriodClick,
}) => (
  <div className="space-y-4">
    {periods
      .map((period, idx) => (
        <PeriodBreakdownCard
          key={idx}
          period={period}
          periodType={periodType}
          onClick={onPeriodClick ? () => onPeriodClick(period, idx) : undefined}
        />
      ))
      .reverse()}
  </div>
);
