import { createFileRoute, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import { PageLayout, Select, Tab } from '../../../components';
import { useApiSummaryTransactionsQuery } from '../../../hooks';
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
    if (path.endsWith('/expenses')) return 'expenses';
    if (path.endsWith('/accounts')) return 'accounts';
    return 'period-breakdown'; // default
  };
  const activeTab = getActiveTab();

  // Calculate dynamic startDate and endDate based on selectedPeriod
  const getPeriodRange = (period: string) => {
    const now = dayjs();
    switch (period) {
      case 'this-week': {
        const start = now.startOf('week');
        const end = now.endOf('week');
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'last-week': {
        const lastWeek = now.subtract(1, 'week');
        const start = lastWeek.startOf('week');
        const end = lastWeek.endOf('week');
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'last-month': {
        const lastMonth = now.subtract(1, 'month');
        const start = lastMonth.startOf('month');
        const end = lastMonth.endOf('month');
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'this-year': {
        const start = now.startOf('year');
        const end = now.endOf('year');
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
      case 'this-month':
      default: {
        const start = now.startOf('month');
        const end = now.endOf('month');
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      }
    }
  };

  const { startDate, endDate } = getPeriodRange(selectedPeriod);

  // Fetch summary transactions period data from API
  useApiSummaryTransactionsQuery({
    startDate,
    endDate,
  });

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
            <Tab.Trigger value="expenses" className="text-center">
              Expenses
            </Tab.Trigger>
            <Tab.Trigger value="accounts" className="text-center">
              Accounts
            </Tab.Trigger>
          </Tab.List>

          <Tab.Content value="period-breakdown">
            <Outlet />
          </Tab.Content>
          <Tab.Content value="expenses">
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
