import type { FC } from 'react';

import { Accounts } from '../components/accounts';
import { useDesktopSummaryFilters } from '../hooks';

export const DesktopAccountsPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <Accounts
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
