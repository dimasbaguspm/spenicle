import type { FC } from 'react';

import { DesktopPeriodBreakdown } from '../components/desktop-period-breakdown';
import { useDesktopSummaryFilters } from '../hooks';

/**
 * Desktop period breakdown analytics page with consistent layout.
 * Only renders the main content (chart and data table) as this is an Outlet component.
 * The sidebar is handled by the parent layout.
 */
export const DesktopPeriodBreakdownPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <DesktopPeriodBreakdown
      periodType={state.currentPeriodType}
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
