import { Text } from '@dimasbaguspm/versaur/primitive';
import React, { useMemo, useState } from 'react';

import { useApiAccountsQuery } from '../../../../hooks/use-api/built-in/use-accounts';
import { useApiSummaryAccountsQuery } from '../../../../hooks/use-api/built-in/use-summary';
import type { Account } from '../../../../types/api';

import { mapAccountPieChartData } from './helpers/mobile-accounts-mappers';
import { useAccountData } from './hooks';
import { MobileAccountsLoader } from './mobile-accounts-loader';
import { MobileAccountsPieChart, MobileAccountsTable } from './presentation';

export interface MobileAccountsProps {
  startDate: Date;
  endDate: Date;
  currentPeriodDisplay: string;
  isCurrentPeriod: boolean;
}

/**
 * Main content component for mobile accounts analytics.
 * Displays pie chart and card-based table with account financial data.
 * Follows the same pattern as mobile period breakdown.
 */
export const MobileAccounts: React.FC<MobileAccountsProps> = ({ startDate, endDate }) => {
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
      <div className="text-center py-8 space-y-2">
        <Text as="h3" fontSize="lg" fontWeight="medium">
          No account data available
        </Text>
        <Text as="p" fontSize="sm">
          No transactions found for the selected period
        </Text>
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
