import React, { useMemo } from 'react';

import { Tile, RadarChart } from '../../../../components';
import { useApiAccountsQuery } from '../../../../hooks/use-api/built-in/use-accounts';
import { useApiSummaryAccountsQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Account } from '../../../../types/api';

import { MobileAccountsCardList } from './mobile-accounts-card-list';
import { MobileAccountsLoader } from './mobile-accounts-loader';

interface MobileAccountsProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

export const MobileAccounts: React.FC<MobileAccountsProps> = ({ startDate, endDate }) => {
  const [accountsResponse] = useApiAccountsQuery({ pageSize: 1000 });
  const allAccounts = accountsResponse?.items;
  const [accountsData, , queryState] = useApiSummaryAccountsQuery(
    {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    {
      staleTime: 60000,
      gcTime: 300000,
    }
  );

  // Build a map of accountId to account object from API data
  const accountMap = useMemo(() => {
    if (allAccounts && Array.isArray(allAccounts)) {
      return allAccounts.reduce(
        (acc, account) => {
          if (account.id) {
            acc[account.id] = account;
          }
          return acc;
        },
        {} as Record<number, Account>
      );
    }
    return {};
  }, [allAccounts]);

  // Merge all accounts with summary data, so all accounts are shown even if no transactions
  const mergedAccountsData = useMemo(() => {
    if (!allAccounts) return [];
    const summaryMap = new Map<number, Record<string, unknown>>();
    if (accountsData && Array.isArray(accountsData)) {
      for (const summary of accountsData) {
        if (summary.accountId != null) summaryMap.set(summary.accountId, summary);
      }
    }
    return allAccounts.map((account) => {
      const summary = summaryMap.get(account.id ?? -1) ?? {};
      return {
        accountId: account.id,
        totalIncome: typeof summary.totalIncome === 'number' ? summary.totalIncome : 0,
        totalExpenses: typeof summary.totalExpenses === 'number' ? summary.totalExpenses : 0,
        totalNet: typeof summary.totalNet === 'number' ? summary.totalNet : 0,
        totalTransactions: typeof summary.totalTransactions === 'number' ? summary.totalTransactions : 0,
        startDate: typeof summary.startDate === 'string' ? summary.startDate : undefined,
        endDate: typeof summary.endDate === 'string' ? summary.endDate : undefined,
      };
    });
  }, [allAccounts, accountsData]);

  // Prepare radar chart data with category (account name)
  const radarChartData = useMemo(
    () =>
      mergedAccountsData.map((item) => {
        const id = item.accountId ?? -1;
        return {
          ...item,
          category: accountMap[id]?.name ?? `Account ${id}`,
        };
      }),
    [mergedAccountsData, accountMap]
  );

  return (
    <Tile className="p-6">
      {queryState.isFetching ? (
        <MobileAccountsLoader count={5} />
      ) : (
        <div className="space-y-6">
          <RadarChart data={radarChartData} dataKey={['totalIncome', 'totalExpenses']} legendAlign="center" />
          <MobileAccountsCardList accountsData={mergedAccountsData} accountMap={accountMap} />
        </div>
      )}
    </Tile>
  );
};
