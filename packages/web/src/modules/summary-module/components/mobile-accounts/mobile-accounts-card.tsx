import React from 'react';

import { Badge } from '../../../../components';
import type { Account, SummaryAccountsPeriod } from '../../../../types/api';
import { AccountIcon } from '../../../account-module/components/account-icon/account-icon';

interface MobileAccountsCardProps {
  account: Required<SummaryAccountsPeriod[number]>;
  accountMap: Record<number, Account>;
}

function getAccountIconAndColor(accountObj?: Account): { iconValue?: string; colorValue?: string } {
  const metadata = accountObj?.metadata ?? {};
  if ('icon' in metadata || 'color' in metadata) {
    return {
      iconValue: metadata?.icon,
      colorValue: metadata.color,
    };
  }
  return { iconValue: undefined, colorValue: undefined };
}

export const MobileAccountsCard: React.FC<MobileAccountsCardProps> = ({ account, accountMap }) => {
  const accountObj = accountMap[account.accountId];
  const accountName = accountObj?.name ?? `Account #${account.accountId}`;

  // Calculate total income, expense, and net
  const totalIncome = account.totalIncome ?? 0;
  const totalExpense = account.totalExpenses ?? 0;
  const net = totalIncome - totalExpense;

  const { iconValue, colorValue } = getAccountIconAndColor(accountObj);

  // Compact number formatting (reuse from period-breakdown-card)
  const formatNumberCompact = (value: number) => {
    return value.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <AccountIcon iconValue={iconValue} colorValue={colorValue} size="sm" />
          <span className="font-medium text-slate-900">{accountName}</span>
        </div>
        <Badge variant="info">
          {account.totalTransactions} txn{account.totalTransactions !== 1 ? 's' : ''}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-slate-500">Income</p>
          <p className="font-semibold text-sage-600">{formatNumberCompact(totalIncome)}</p>
        </div>
        <div>
          <p className="text-slate-500">Expenses</p>
          <p className="font-semibold text-coral-600">{formatNumberCompact(totalExpense)}</p>
        </div>
        <div>
          <p className="text-slate-500">Net</p>
          <p className={`font-semibold ${net >= 0 ? 'text-sage-600' : 'text-coral-600'}`}>
            {net >= 0 ? '+' : ''}
            {formatNumberCompact(net)}
          </p>
        </div>
      </div>
    </div>
  );
};
