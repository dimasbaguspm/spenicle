import type { FC } from 'react';

import { MobileCategories } from '../components/mobile-categories';
import { useDesktopSummaryFilters } from '../hooks';

/**
 * Mobile categories analytics page with consistent layout.
 * Only renders the main content (pie chart and card table) as this is an Outlet component.
 * The period controls are handled by the parent layout.
 */
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
