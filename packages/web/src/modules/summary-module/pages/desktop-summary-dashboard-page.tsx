import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { Badge, PageLayout, Tile } from '../../../components';
import { QuickInsightsWidget } from '../components/desktop-overview-widgets';
import { FinancialSummaryPeriodCardList } from '../components/financial-summary-period-card';

export const DesktopSummaryDashboardPageComponent = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // derive active panel from current route
  const getActivePanelFromRoute = () => {
    const path = location.pathname;
    if (path.includes('/period-breakdown')) return 'period';
    if (path.includes('/categories')) return 'categories';
    if (path.includes('/accounts')) return 'accounts';
    return 'period'; // default fallback
  };

  const [selectedPanel, setSelectedPanel] = useState<'period' | 'categories' | 'accounts'>(getActivePanelFromRoute);

  // sync panel selection with route changes
  useEffect(() => {
    const activePanel = getActivePanelFromRoute();
    setSelectedPanel(activePanel);
  }, [location.pathname]);

  // shared state for period controls across all panels
  const [periodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [periodIndex] = useState(0);

  // panel configuration for desktop layout
  const panelConfig = useMemo(
    () => ({
      period: {
        title: 'Period Analysis',
        description: 'Weekly and monthly trends',
        badge: 'Trending',
      },
      categories: {
        title: 'Category Breakdown',
        description: 'Spending by category',
        badge: 'Categories',
      },
      accounts: {
        title: 'Account Overview',
        description: 'Activity by account',
        badge: 'Accounts',
      },
    }),
    [periodType, periodIndex]
  );

  // handle panel navigation with route updates
  const handlePanelNavigation = async (panel: 'period' | 'categories' | 'accounts') => {
    const routeMap = {
      period: '/analytics/period-breakdown',
      categories: '/analytics/categories',
      accounts: '/analytics/accounts',
    };

    setSelectedPanel(panel);
    await navigate({ to: routeMap[panel] });
  };

  return (
    <PageLayout background="cream" title="Analytics Dashboard" showBackButton>
      {/* desktop-specific layout with multiple panels */}
      <div className="space-y-6">
        {/* summary cards remain at top for key metrics */}
        <FinancialSummaryPeriodCardList />

        {/* desktop split-panel layout with sticky sidebar */}
        <div className="grid grid-cols-12 gap-6">
          {/* left sidebar navigation and insights - sticky */}
          <div className="col-span-3 space-y-4 sticky top-6 self-start h-fit max-h-[calc(100vh-12rem)] overflow-y-auto">
            <Tile className="p-4">
              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-semibold text-slate-900">Analysis Panels</h3>
                <p className="text-sm text-slate-500">Select an analysis view</p>
              </div>

              <div className="space-y-2">
                {Object.entries(panelConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => handlePanelNavigation(key as typeof selectedPanel)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedPanel === key
                        ? 'bg-coral-50 border-coral-200 border text-coral-900 shadow-sm'
                        : 'hover:bg-mist-50 text-slate-700 border border-transparent hover:border-mist-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{config.title}</span>
                      <Badge variant={selectedPanel === key ? 'coral' : 'mist'} size="sm">
                        {config.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">{config.description}</p>
                  </button>
                ))}
              </div>
            </Tile>

            {/* insights widget - also sticky */}
            <QuickInsightsWidget />
          </div>

          {/* main content panel - scrollable */}
          <div className="col-span-9">
            <Tile className="p-6 min-h-[600px]">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-4 border-b border-mist-100 z-10">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{panelConfig[selectedPanel].title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{panelConfig[selectedPanel].description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="sage" size="md">
                    Desktop View
                  </Badge>
                  <Badge variant="info" size="sm">
                    {selectedPanel.charAt(0).toUpperCase() + selectedPanel.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* render selected panel component */}
              <div className="pt-2">
                <Outlet />
              </div>
            </Tile>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
