import { Outlet } from '@tanstack/react-router';

import { QuickInsightsWidget } from '../desktop-overview-widgets';

export const DesktopSummaryContent = () => {
  return (
    <div className="col-span-9 space-y-6">
      <QuickInsightsWidget />

      <Outlet />
    </div>
  );
};
