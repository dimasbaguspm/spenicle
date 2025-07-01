import type { FC } from 'react';

import { DesktopAccounts } from '../components/desktop-accounts';
import { useDesktopSummaryFilters } from '../hooks';

/**
 * Desktop accounts analytics page with consistent layout.
 * Only renders the main content (pie chart and data table) as this is an Outlet component.
 * The sidebar is handled by the parent layout.
 */
export const DesktopAccountsPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <DesktopAccounts
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
