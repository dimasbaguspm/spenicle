import { createFileRoute } from '@tanstack/react-router';

import { useViewport } from '../../../hooks';
import { DesktopTransactionPage, MobileTransactionPage } from '../../../modules/transaction-module';

export const Route = createFileRoute('/_protected/_experienced-user/')({
  component: TransactionsComponent,
});

function TransactionsComponent() {
  const { isDesktop } = useViewport();

  if (isDesktop) return <DesktopTransactionPage />;
  return <MobileTransactionPage />;
}
