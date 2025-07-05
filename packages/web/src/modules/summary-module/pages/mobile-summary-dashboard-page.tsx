import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageLayout, Tab } from '../../../components';
import { IconButton } from '../../../components/button/icon-button';
import { QuickInsightsWidget } from '../components/desktop-overview-widgets';
import { PeriodSelectorModal } from '../components/period-selector-modal';
import { useDesktopSummaryFilters, type PeriodType } from '../hooks/use-desktop-summary-filters';

export const MobileSummaryDashboardPageComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useDesktopSummaryFilters();

  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  // local state for modal form
  const [localPeriodType, setLocalPeriodType] = useState<PeriodType>(state.currentPeriodType);
  const [localStartDate, setLocalStartDate] = useState<Date>(state.periodStartDate);
  const [localEndDate, setLocalEndDate] = useState<Date>(state.periodEndDate);

  // update local state when global state changes
  useEffect(() => {
    setLocalPeriodType(state.currentPeriodType);
    setLocalStartDate(state.periodStartDate);
    setLocalEndDate(state.periodEndDate);
  }, [state.currentPeriodType, state.periodStartDate, state.periodEndDate]);

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
  const handleModalConfirm = () => {
    // update global period filter using the filters hook
    actions.updateDateRange({ start: localStartDate, end: localEndDate });
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
        periodType={localPeriodType}
        startDate={localStartDate}
        endDate={localEndDate}
        onPeriodTypeChange={setLocalPeriodType}
        onStartDateChange={setLocalStartDate}
        onEndDateChange={setLocalEndDate}
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
