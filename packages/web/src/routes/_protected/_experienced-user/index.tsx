import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../hooks';
import { DesktopDashboardPage, MobileDashboardPage } from '../../../modules/dashboard-module';

export const Route = createFileRoute('/_protected/_experienced-user/')({
  component: HomeComponent,
});

function HomeComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopDashboardPage />;
  return <MobileDashboardPage />;
}
