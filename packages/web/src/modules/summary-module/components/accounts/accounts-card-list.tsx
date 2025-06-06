import React from 'react';

import type { Account, SummaryAccountsPeriod } from '../../../../types/api';

import { AccountsCard } from './accounts-card';
import { AccountsCardNotFound } from './accounts-card-not-found';

interface AccountsCardListProps {
  accountsData?: SummaryAccountsPeriod;
  accountMap: Record<number, Account>;
}

export const AccountsCardList: React.FC<AccountsCardListProps> = ({ accountsData, accountMap }) => {
  if (!accountsData || accountsData.length === 0) {
    return <AccountsCardNotFound />;
  }

  return (
    <div className="space-y-4">
      {accountsData.map((account) => (
        <AccountsCard
          key={account.accountId}
          account={account as Required<SummaryAccountsPeriod[number]>}
          accountMap={accountMap}
        />
      ))}
    </div>
  );
};
