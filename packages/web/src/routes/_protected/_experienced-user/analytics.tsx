import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import { useState, useEffect } from 'react';

import { PageLayout, Select, Tab } from '../../../components';
import { FinancialSummaryPeriodCardList } from '../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics')({
  component: AnalyticsComponent,
});

function AnalyticsComponent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');

  // Determine active tab from location
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.endsWith('/period-breakdown')) return 'period-breakdown';
    if (path.endsWith('/categories')) return 'categories';
    if (path.endsWith('/accounts')) return 'accounts';
    return 'period-breakdown'; // default
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
    <PageLayout
      background="cream"
      title="Analytics"
      showBackButton
      rightContent={
        <Select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
          <option value="this-week">This Week</option>
          <option value="last-week">Last Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="this-year">This Year</option>
        </Select>
      }
    >
      <div className="space-y-6">
        {/* Financial Summary Period Cards - Always visible */}
        <FinancialSummaryPeriodCardList selectedPeriod={selectedPeriod} />

        <Tab value={activeTab} onValueChange={handleOnTabChange} variant="tabs">
          <Tab.List className="w-full grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            <Tab.Trigger value="period-breakdown" className="text-center">
              Period Breakdown
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
}
