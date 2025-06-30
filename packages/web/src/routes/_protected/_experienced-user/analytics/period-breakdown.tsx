import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import { DesktopPeriodBreakdownPage } from '../../../../modules/summary-module/pages/desktop-period-breakdown-page';
import { MobilePeriodBreakdownPage } from '../../../../modules/summary-module/pages/mobile-period-breakdown-page';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/period-breakdown')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) {
    return <DesktopPeriodBreakdownPage />;
  }

  return <MobilePeriodBreakdownPage />;
}
