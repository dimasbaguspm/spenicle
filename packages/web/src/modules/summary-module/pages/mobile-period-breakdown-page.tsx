import type { FC } from 'react';

import { MobilePeriodBreakdown } from '../components/mobile-period-breakdown';
import { useDesktopSummaryFilters } from '../hooks';

export const MobilePeriodBreakdownPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <MobilePeriodBreakdown
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
