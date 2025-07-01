import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import { DesktopAccountsPage, MobileAccountsPage } from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/accounts')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopAccountsPage />;
  return <MobileAccountsPage />;
}
