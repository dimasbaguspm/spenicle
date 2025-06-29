import { useMemo } from 'react';

import { PageLayout } from '../../../components';
import { DesktopSummaryMainContent, DesktopSummarySidebar } from '../components';
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
        {/* desktop grid layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* left sidebar: streamlined navigation */}
          <DesktopSummarySidebar
            currentPeriodDisplay={state.currentPeriodDisplay}
            isCurrentPeriod={state.isCurrentPeriod}
            selectedPanel={state.selectedPanel}
            panelConfig={panelConfig}
            onPanelNavigation={actions.navigateToPanel}
          />

          {/* main content area - renders selected panel via outlet */}
          <DesktopSummaryMainContent />
        </div>
      </div>
    </PageLayout>
  );
};
