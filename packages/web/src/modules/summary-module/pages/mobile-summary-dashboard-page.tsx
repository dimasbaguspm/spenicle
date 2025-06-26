import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { PageLayout, Tab } from '../../../components';
import { FinancialSummaryPeriodCardList } from '../components/financial-summary-period-card';

export const MobileSummaryDashboardPageComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <PageLayout background="cream" title="Analytics" showBackButton>
      <div className="space-y-6">
        <FinancialSummaryPeriodCardList />

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
