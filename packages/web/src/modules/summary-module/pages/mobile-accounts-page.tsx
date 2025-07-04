import type { FC } from 'react';

import { MobileAccounts } from '../components/mobile-accounts';
import { useDesktopSummaryFilters } from '../hooks';

export const MobileAccountsPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <MobileAccounts
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
