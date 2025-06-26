import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../../hooks';
import { DesktopTransactionPeriodPage, MobileTransactionPeriodPage } from '../../../../modules/transaction-module';

export const Route = createFileRoute('/_protected/_experienced-user/transactions/period')({
  component: RouteComponent,
});

function RouteComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopTransactionPeriodPage />;
  return <MobileTransactionPeriodPage />;
}
