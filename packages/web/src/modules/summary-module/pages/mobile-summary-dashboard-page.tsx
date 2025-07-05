import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageLayout, Tab } from '../../../components';
import { IconButton } from '../../../components/button/icon-button';
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
    <PageLayout
      background="cream"
      title="Analytics"
      showBackButton
      rightContent={
        <IconButton variant="mist-ghost" size="md" aria-label="Select period" onClick={() => setPeriodModalOpen(true)}>
          <Calendar className="w-5 h-5" />
        </IconButton>
      }
    >
      {/* period selector modal */}
      <PeriodSelectorModal
        isOpen={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        onConfirm={handleModalConfirm}
      />
      <div className="space-y-6">
        <QuickInsightsWidget />
        <Tab value={activeTab} onValueChange={handleOnTabChange} type="tabs">
          <Tab.List className="w-full grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg">
            <Tab.Trigger value="period-breakdown" className="text-center">
              Period
            </Tab.Trigger>
            <Tab.Trigger value="categories" className="text-center">
              Categories
            </Tab.Trigger>
            <Tab.Trigger value="accounts" className="text-center">
              Accounts
            </Tab.Trigger>
          </Tab.List>
          <Tab.Content value="period-breakdown">
            <Outlet />
          </Tab.Content>
          <Tab.Content value="categories">
            <Outlet />
          </Tab.Content>
          <Tab.Content value="accounts">
            <Outlet />
          </Tab.Content>
        </Tab>
      </div>
    </PageLayout>
  );
};
