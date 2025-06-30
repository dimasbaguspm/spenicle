import type { FC } from 'react';

import { PeriodBreakdown } from '../components/period-breakdown';
import { useDesktopSummaryFilters } from '../hooks';

export const MobilePeriodBreakdownPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <PeriodBreakdown
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
