import { createFileRoute, redirect } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import {
  DesktopSummaryDashboardPageComponent,
  MobileSummaryDashboardPageComponent,
} from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics')({
  beforeLoad: (c) => {
    const location = c.location.pathname;
    if (location === '/analytics') {
      throw redirect({
        to: '/analytics/period-breakdown',
        replace: true,
      });
    }
  },
  component: () => {
    const { isDesktop } = useViewport();

    if (isDesktop) return <DesktopSummaryDashboardPageComponent />;
    return <MobileSummaryDashboardPageComponent />;
  },
});
