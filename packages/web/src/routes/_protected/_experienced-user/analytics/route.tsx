import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import {
  DesktopSummaryDashboardPageComponent,
  MobileSummaryDashboardPageComponent,
} from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics')({
  component: AnalyticsComponent,
});

function AnalyticsComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopSummaryDashboardPageComponent />;
  return <MobileSummaryDashboardPageComponent />;
}
