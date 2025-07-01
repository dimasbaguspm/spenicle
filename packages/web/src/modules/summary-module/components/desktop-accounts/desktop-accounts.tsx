import React, { useMemo } from 'react';

import { Tile } from '../../../../components';
import { useApiAccountsQuery } from '../../../../hooks/use-api/built-in/use-accounts';
import { useApiSummaryAccountsQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Account } from '../../../../types/api';

import { DesktopAccountsLoader } from './desktop-accounts-loader';
import { mapEnrichedAccountData, mapAccountPieChartData } from './helpers';
import { AccountsPieChart, AccountsTable, createDesktopAccountsColumns } from './presentation';

interface DesktopAccountsMainContentProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Main content component for desktop accounts analytics.
 * Displays pie chart and data table with account financial data.
 * Follows the same pattern as desktop period breakdown.
 */
export const DesktopAccounts: React.FC<DesktopAccountsMainContentProps> = ({ startDate, endDate }) => {
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

  // build account map for enriched data
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

  // enrich account data with metadata
  const enrichedAccountData = useMemo(
    () => mapEnrichedAccountData({ accountsData: accountsData ?? [], accountMap }),
    [accountsData, accountMap]
  );

  // prepare pie chart data (default to expenses view)
  const pieChartData = useMemo(
    () => mapAccountPieChartData({ accountData: enrichedAccountData, chartType: 'expenses' }),
    [enrichedAccountData]
  );

  const columns = createDesktopAccountsColumns();

  if (queryState.isFetching) {
    return (
      <div className="space-y-6">
        <Tile className="p-6">
          <DesktopAccountsLoader count={5} />
        </Tile>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* pie chart display */}
      <AccountsPieChart chartData={pieChartData} chartType="expenses" />
      {/* data table */}
      <AccountsTable data={enrichedAccountData} columns={columns} />
    </div>
  );
};
