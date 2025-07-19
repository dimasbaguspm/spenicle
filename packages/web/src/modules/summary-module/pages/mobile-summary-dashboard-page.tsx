import { AppBar, Tabs, Text } from '@dimasbaguspm/versaur';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { BackButton } from '../../../components';
import { QuickInsightsWidget } from '../components/desktop-overview-widgets';
import { PeriodSelectorModal, type PeriodSelectorFormData } from '../components/period-selector-modal';
import { useDesktopSummaryFilters } from '../hooks';

export const MobileSummaryDashboardPageComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [periodModalOpen, setPeriodModalOpen] = useState(false);

  const { actions } = useDesktopSummaryFilters();

  // Determine active tab from location
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.endsWith('/period-breakdown')) return 'period-breakdown';
    if (path.endsWith('/categories')) return 'categories';
    if (path.endsWith('/accounts')) return 'accounts';
    return 'period-breakdown';
  };
  const activeTab = getActiveTab();

  const handleOnTabChange = async (value: string) => {
    await navigate({
      to: `/analytics/${value}`,
      search: location.search,
    });
  };

  useEffect(() => {
    // If the current path is exactly /analytics, redirect to /analytics/period-breakdown
    if (location.pathname === '/analytics') {
      void navigate({ to: '/analytics/period-breakdown', replace: true });
    }
  }, [location.pathname, navigate]);

  // handle modal confirm (replace with global update logic as needed)
  const handleModalConfirm = (data: PeriodSelectorFormData) => {
    if (!data.startDate || !data.endDate) return;
    actions.updateDateRange({ start: data.startDate, end: data.endDate });
    setPeriodModalOpen(false);
  };

  return (
    <div className="mx-4">
      <AppBar>
        <AppBar.Leading>
          <BackButton />
        </AppBar.Leading>
        <AppBar.Center>
          <AppBar.Headline>
            <Text as="h1" fontSize="lg" fontWeight="bold">
              Analytics
            </Text>
          </AppBar.Headline>
        </AppBar.Center>
      </AppBar>

      {/* period selector modal */}
      <PeriodSelectorModal
        isOpen={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        onConfirm={handleModalConfirm}
      />

      <div className="space-y-6">
        <QuickInsightsWidget />

        <Tabs value={activeTab} onValueChange={handleOnTabChange} className="w-full">
          <Tabs.Trigger value="period-breakdown">Period</Tabs.Trigger>
          <Tabs.Trigger value="categories">Categories</Tabs.Trigger>
          <Tabs.Trigger value="accounts">Accounts</Tabs.Trigger>
        </Tabs>

        <Outlet />
      </div>
    </div>
  );
};
