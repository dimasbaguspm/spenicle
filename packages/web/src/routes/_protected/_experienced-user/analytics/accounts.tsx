import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { Accounts } from '../../../../modules/summary-module';

export const Route = createFileRoute('/_protected/_experienced-user/analytics/accounts')({
  component: RouteComponent,
});

function RouteComponent() {
  const [accountsPeriodType, setAccountsPeriodType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [accountsIndex, setAccountsIndex] = useState(0);

  const handleAccountsPeriodType = (type: 'weekly' | 'monthly' | 'yearly') => {
    setAccountsPeriodType(type);
    setAccountsIndex(0);
  };

  return (
    <Accounts
      periodType={accountsPeriodType}
      periodIndex={accountsIndex}
      setPeriodType={handleAccountsPeriodType}
      setPeriodIndex={setAccountsIndex}
    />
  );
}
