import type { FC } from 'react';

import { PeriodBreakdownMainContent } from '../components/period-breakdown/period-breakdown-main-content';
import { useDesktopSummaryFilters } from '../hooks';

/**
 * Desktop period breakdown analytics page with consistent layout.
 * Only renders the main content (chart and data table) as this is an Outlet component.
 * The sidebar is handled by the parent layout.
 */
export const DesktopPeriodBreakdownPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <PeriodBreakdownMainContent
      periodType={state.currentPeriodType}
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
