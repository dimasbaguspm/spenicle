import { useMemo } from 'react';

import { PageLayout } from '../../../components';
import { DesktopSummaryContent } from '../components/desktop-summary-content';
import { DesktopSummarySidebar } from '../components/desktop-summary-sidebar';
import { useDesktopSummaryFilters } from '../hooks';

export const DesktopSummaryDashboardPageComponent = () => {
  const { state, actions } = useDesktopSummaryFilters();

  // panel configuration for desktop layout
  const panelConfig = useMemo(
    () => ({
      period: {
        title: 'Period',
        description: 'Weekly and monthly trends',
        badge: 'Trending',
      },
      categories: {
        title: 'Category',
        description: 'Spending by category',
        badge: 'Categories',
      },
      accounts: {
        title: 'Account',
        description: 'Activity by account',
        badge: 'Accounts',
      },
    }),
    []
  );

  return (
    <PageLayout background="cream" title="Analytics Dashboard" showBackButton>
      <div className="space-y-6">
        <div className="grid grid-cols-12 gap-6">
          <DesktopSummarySidebar
            currentPeriodDisplay={state.currentPeriodDisplay}
            isCurrentPeriod={state.isCurrentPeriod}
            selectedPanel={state.selectedPanel}
            panelConfig={panelConfig}
            onPanelNavigation={actions.navigateToPanel}
          />

          <DesktopSummaryContent />
        </div>
      </div>
    </PageLayout>
  );
};
