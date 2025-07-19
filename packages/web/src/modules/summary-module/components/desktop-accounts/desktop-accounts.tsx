import { Tile } from '@dimasbaguspm/versaur';
import { useNavigate } from '@tanstack/react-router';
import React, { useCallback, useMemo, useState } from 'react';

import { useApiAccountsQuery } from '../../../../hooks/use-api/built-in/use-accounts';
import { useApiSummaryAccountsQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Account } from '../../../../types/api';

import { DesktopAccountsLoader } from './desktop-accounts-loader';
import { mapEnrichedAccountData, mapAccountPieChartData } from './helpers';
import { AccountsPieChart, AccountsTable } from './presentation';

interface DesktopAccountsMainContentProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Main content component for desktop accounts analytics.
 * Displays pie chart and data table with account financial data.
 * Includes toggle for expenses/income view with synchronized chart and table.
 */
export const DesktopAccounts: React.FC<DesktopAccountsMainContentProps> = ({ startDate, endDate }) => {
  const navigate = useNavigate();

  // state for chart type toggle (expenses vs income)
  const [chartType, setChartType] = useState<'expenses' | 'income'>('expenses');
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

  // sort account data by selected chart type (highest first)
  const sortedAccountData = useMemo(() => {
    return [...enrichedAccountData].sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA; // highest first
    });
  }, [enrichedAccountData, chartType]);

  // prepare pie chart data based on selected chart type
  const pieChartData = useMemo(
    () => mapAccountPieChartData({ accountData: enrichedAccountData, chartType }),
    [enrichedAccountData, chartType]
  );

  const handleOnMoreClick = useCallback(async () => {
    await navigate({
      to: '/transactions/period',
      search: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  }, [startDate, endDate, navigate]);

  if (queryState.isFetching) {
    return (
      <Tile className="space-y-6">
        <DesktopAccountsLoader count={5} />
      </Tile>
    );
  }

  return (
    <div className="space-y-6">
      {/* pie chart display with toggle */}
      <AccountsPieChart chartData={pieChartData} chartType={chartType} onChartTypeChange={setChartType} />
      {/* data table */}
      <AccountsTable data={sortedAccountData} chartType={chartType} onMoreClick={handleOnMoreClick} />
    </div>
  );
};
