import type { FC } from 'react';

import { MobileCategories } from '../components/mobile-categories';
import { useDesktopSummaryFilters } from '../hooks';

export const MobileCategoriesPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <MobileCategories
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
