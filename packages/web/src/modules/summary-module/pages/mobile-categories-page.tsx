import type { FC } from 'react';

import { Categories } from '../components/categories';
import { useDesktopSummaryFilters } from '../hooks';

export const MobileCategoriesPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <Categories
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
