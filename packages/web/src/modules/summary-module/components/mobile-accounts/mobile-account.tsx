import React, { useMemo, useState } from 'react';

import { useApiAccountsQuery } from '../../../../hooks/use-api/built-in/use-accounts';
import { useApiSummaryAccountsQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Account } from '../../../../types/api';

import { mapAccountPieChartData } from './helpers/mobile-accounts-mappers';
import { useAccountData } from './hooks';
import { MobileAccountsLoader } from './mobile-accounts-loader';
import { MobileAccountsPieChart, MobileAccountsTable } from './presentation';

interface MobileAccountProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Alternative naming component for mobile account analytics.
 * Provides the same functionality as MobileAccounts for consistency with naming patterns.
 */
export const MobileAccount: React.FC<MobileAccountProps> = ({ startDate, endDate }) => {
  // toggle state for chart type selection
  const [chartType, setChartType] = useState<'expenses' | 'income'>('expenses');

  const [accountsResponse] = useApiAccountsQuery({ pageSize: 1000 });
  const allAccounts = accountsResponse && 'items' in accountsResponse ? (accountsResponse.items as Account[]) : [];

  const [summaryData, , queryState] = useApiSummaryAccountsQuery(
    {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    {
      staleTime: 60000,
      gcTime: 300000,
    }
  );

  // build account map for quick lookup
  const accountMap = useMemo(() => {
    return allAccounts.reduce(
      (acc, account) => {
        if (account.id) {
          acc[account.id] = account;
        }
        return acc;
      },
      {} as Record<number, Account>
    );
  }, [allAccounts]);

  // use the new modular data processing hook
  const { enrichedData, hasData } = useAccountData({
    data: summaryData ?? [],
    accountMap,
  });

  // prepare pie chart data using the new mapper
  const pieChartData = useMemo(() => {
    return mapAccountPieChartData({
      accountData: enrichedData,
      chartType,
    });
  }, [enrichedData, chartType]);

  // sort enriched data by selected chart type (highest first)
  const sortedEnrichedData = useMemo(() => {
    return [...enrichedData].sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA;
    });
  }, [enrichedData, chartType]);

  if (queryState.isFetching) {
    return <MobileAccountsLoader count={5} />;
  }

  if (!hasData) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="text-slate-400 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">No account data available</h3>
          <p className="text-sm text-slate-500">No transactions found for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileAccountsPieChart chartData={pieChartData} chartType={chartType} onChartTypeChange={setChartType} />

      <MobileAccountsTable
        data={sortedEnrichedData}
        accounts={allAccounts}
        chartType={chartType}
        onAccountClick={(accountId) => {
          // optional: handle account click for navigation
          // could navigate to account detail view
          void accountId;
        }}
      />
    </div>
  );
};
