import React from 'react';

import type { Account, SummaryAccountsPeriod } from '../../../../types/api';

import { MobileAccountsCard } from './mobile-accounts-card';
import { MobileAccountsCardNotFound } from './mobile-accounts-card-not-found';

interface MobileAccountsCardListProps {
  accountsData?: SummaryAccountsPeriod;
  accountMap: Record<number, Account>;
}

export const MobileAccountsCardList: React.FC<MobileAccountsCardListProps> = ({ accountsData, accountMap }) => {
  if (!accountsData || accountsData.length === 0) {
    return <MobileAccountsCardNotFound />;
  }

  return (
    <div className="space-y-4">
      {accountsData.map((account) => (
        <MobileAccountsCard
          key={account.accountId}
          account={account as Required<SummaryAccountsPeriod[number]>}
          accountMap={accountMap}
        />
      ))}
    </div>
  );
};
