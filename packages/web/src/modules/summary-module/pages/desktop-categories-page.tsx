import type { FC } from 'react';

import { DesktopCategories } from '../components/desktop-categories';
import { useDesktopSummaryFilters } from '../hooks';

/**
 * Desktop categories analytics page with consistent layout.
 * Only renders the main content (pie chart and data table) as this is an Outlet component.
 * The sidebar is handled by the parent layout.
 */
export const DesktopCategoriesPage: FC = () => {
  const { state } = useDesktopSummaryFilters();

  return (
    <DesktopCategories
      startDate={state.periodStartDate}
      endDate={state.periodEndDate}
      currentPeriodDisplay={state.currentPeriodDisplay}
      isCurrentPeriod={state.isCurrentPeriod}
    />
  );
};
