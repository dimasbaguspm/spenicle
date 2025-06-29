import { createFileRoute } from '@tanstack/react-router';

import { PeriodBreakdown } from '../../../../modules/summary-module';
import { useDesktopSummaryFilters } from '../../../../modules/summary-module/hooks';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/period-breakdown')({
  component: RouteComponent,
});

function RouteComponent() {
  const { state } = useDesktopSummaryFilters();

  return (
    <PeriodBreakdown
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
}
