// mobile-period-breakdown-card-list component, renamed from period-breakdown-card-list.tsx
import React from 'react';

import type { SummaryTransactionsPeriod } from '../../../../types/api';
import type { PeriodType } from '../../hooks';

import { MobilePeriodBreakdownCard } from './mobile-period-breakdown-card';

interface MobilePeriodBreakdownCardListProps {
  periods: SummaryTransactionsPeriod;
  periodType: PeriodType;
  onPeriodClick?: (period: SummaryTransactionsPeriod[number], idx: number) => void;
}

export const MobilePeriodBreakdownCardList: React.FC<MobilePeriodBreakdownCardListProps> = ({
  periods,
  periodType,
  onPeriodClick,
}) => (
  <div className="space-y-4">
    {periods.map((period, idx) => (
      <MobilePeriodBreakdownCard
        key={idx}
        period={period}
        periodType={periodType}
        onClick={onPeriodClick ? () => onPeriodClick(period, idx) : undefined}
      />
    ))}
  </div>
);
