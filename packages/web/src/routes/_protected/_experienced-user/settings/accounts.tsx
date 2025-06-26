import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import { DesktopAccountDashboardPage, MobileAccountDashboardPage } from '../../../../modules/account-module';

export const Route = createFileRoute('/_protected/_experienced-user/settings/accounts')({
  component: AccountsComponent,
});

function AccountsComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopAccountDashboardPage />;
  return <MobileAccountDashboardPage />;
}
