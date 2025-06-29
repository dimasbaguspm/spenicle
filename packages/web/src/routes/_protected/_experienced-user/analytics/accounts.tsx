import { createFileRoute } from '@tanstack/react-router';

import { Accounts } from '../../../../modules/summary-module';
import { useDesktopSummaryFilters } from '../../../../modules/summary-module/hooks';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/accounts')({
  component: RouteComponent,
});

function RouteComponent() {
  const { state } = useDesktopSummaryFilters();

  return (
    <Accounts
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
}
