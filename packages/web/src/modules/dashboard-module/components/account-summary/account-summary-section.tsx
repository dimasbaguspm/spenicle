import dayjs from 'dayjs';
import { useMemo } from 'react';

import { Tile } from '../../../../components';
import { useApiAccountsQuery, useApiSummaryAccountsQuery } from '../../../../hooks';
import type { Account, SummaryAccountsPeriod } from '../../../../types/api';

import { AccountSummaryHeader } from './account-summary-header';
import { AccountSummaryList, type AccountSummaryItem } from './account-summary-list';
import { AccountSummaryStats } from './account-summary-stats';

export interface AccountSummarySectionProps {
  /**
   * Header configuration for the section
   */
  header?: {
    title?: string;
    activeCount?: number;
  };
  /**
   * Summary statistics data
   */
  stats?: {
    totalNetWorth: number;
    thisMonth: number;
    thisWeek: number;
    currencySymbol?: string;
  };
  /**
   * List of account summary items with activity information
   */
  accounts?: AccountSummaryItem[];
  /**
   * Click handler for the entire section
   */
  onClick?: () => void;
  /**
   * Additional CSS classes for the container
   */
  className?: string;
}

/**
 * AccountSummarySection displays a compact overview of account activity and summary statistics.
 * This component is designed for the dashboard home page to provide quick insights.
 */
export function AccountSummarySection({
  header,
  stats,
  accounts: accountsProp,
  onClick,
  className,
}: AccountSummarySectionProps) {
  // Get current month and week date ranges for summary data
  const { currentMonthStart, currentMonthEnd, currentWeekStart, currentWeekEnd } = useMemo(() => {
    const now = dayjs();
    return {
      currentMonthStart: now.startOf('month').toISOString(),
      currentMonthEnd: now.endOf('month').toISOString(),
      currentWeekStart: now.startOf('week').toISOString(),
      currentWeekEnd: now.endOf('week').toISOString(),
    };
  }, []);

  // Fetch accounts data
  const [accountsResponse] = useApiAccountsQuery({ pageSize: 1000 });
  const allAccounts = accountsResponse?.items ?? [];

  // Fetch summary data for current month and week
  const [monthSummaryData] = useApiSummaryAccountsQuery({
    startDate: currentMonthStart,
    endDate: currentMonthEnd,
  });

  const [weekSummaryData] = useApiSummaryAccountsQuery({
    startDate: currentWeekStart,
    endDate: currentWeekEnd,
  });

  // Create account map for quick lookups
  const accountMap = useMemo(() => {
    const map = new Map<number, Account>();
    allAccounts.forEach((account) => {
      if (account.id) {
        map.set(account.id, account);
      }
    });
    return map;
  }, [allAccounts]);

  // Transform account data for the summary list with proper color mapping
  const transformedAccounts = useMemo(() => {
    if (accountsProp) return accountsProp; // Use provided accounts if available

    // Create a map of account summaries for quick lookup
    const summaryMap = new Map<number, SummaryAccountsPeriod[number]>();
    (monthSummaryData ?? []).forEach((summary) => {
      if (summary.accountId) {
        summaryMap.set(summary.accountId, summary);
      }
    });

    // Transform all accounts (both active and inactive) with priority for active ones
    const allTransformedAccounts = allAccounts.map((account) => {
      const summary = summaryMap.get(account.id!);

      // Calculate net amount and determine last activity
      const netAmount = summary ? (summary.totalIncome ?? 0) - (summary.totalExpenses ?? 0) : 0;
      const transactionCount = summary?.totalTransactions ?? 0;

      // Enhanced heuristic for "last activity" based on transaction count
      let lastActivity = 'No activity';
      if (transactionCount > 15) lastActivity = 'Very active';
      else if (transactionCount > 10) lastActivity = 'Today';
      else if (transactionCount > 5) lastActivity = '1 day ago';
      else if (transactionCount > 2) lastActivity = '3 days ago';
      else if (transactionCount > 0) lastActivity = '1 week ago';

      return {
        account,
        lastActivity,
        amount: Math.round(netAmount),
        transactionCount, // Keep for sorting
        hasActivity: transactionCount > 0,
      };
    });

    // Sort accounts: active ones first (by transaction count), then inactive ones
    const sortedAccounts = allTransformedAccounts.sort((a, b) => {
      // First, sort by activity status (active accounts first)
      if (a.hasActivity && !b.hasActivity) return -1;
      if (!a.hasActivity && b.hasActivity) return 1;

      // Within active accounts, sort by transaction count (descending)
      if (a.hasActivity && b.hasActivity) {
        return b.transactionCount - a.transactionCount;
      }

      // Within inactive accounts, sort alphabetically by name
      return (a.account.name ?? '').localeCompare(b.account.name ?? '');
    });

    // Show top 3 accounts (mix of active and inactive for better overview)
    return sortedAccounts
      .slice(0, 3)
      .map(({ transactionCount: _transactionCount, hasActivity: _hasActivity, ...item }) => item);
  }, [accountsProp, monthSummaryData, allAccounts, accountMap]);

  // Calculate summary statistics
  const calculatedStats = useMemo(() => {
    if (stats) return stats; // Use provided stats if available

    // Calculate net change for this month (income - expenses)
    const monthNetChange = (monthSummaryData ?? []).reduce((acc, summary) => {
      const netAmount = (summary.totalIncome ?? 0) - (summary.totalExpenses ?? 0);
      return acc + netAmount;
    }, 0);

    // Calculate net change for this week (income - expenses)
    const weekNetChange = (weekSummaryData ?? []).reduce((acc, summary) => {
      const netAmount = (summary.totalIncome ?? 0) - (summary.totalExpenses ?? 0);
      return acc + netAmount;
    }, 0);

    // Calculate total net worth as cumulative balance across all accounts
    // For now, use a larger simulated value to differentiate from monthly changes
    // In a real app, this would come from actual account balances
    const totalNetWorth = monthNetChange * 12; // Simulate annual accumulation

    return {
      totalNetWorth: Math.round(totalNetWorth),
      thisMonth: Math.round(monthNetChange),
      thisWeek: Math.round(weekNetChange),
      currencySymbol: '$',
    };
  }, [stats, monthSummaryData, weekSummaryData]);

  // Calculate header data
  const calculatedHeader = useMemo(() => {
    if (header) return header;

    return {
      title: 'Account Summary',
      activeCount: allAccounts.length,
    };
  }, [header, allAccounts.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      <AccountSummaryHeader title={calculatedHeader.title} activeCount={calculatedHeader.activeCount} />
      <Tile
        className={`p-6 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
      >
        <div className="space-y-6">
          <AccountSummaryStats
            totalNetWorth={calculatedStats.totalNetWorth}
            thisMonth={calculatedStats.thisMonth}
            thisWeek={calculatedStats.thisWeek}
            currencySymbol={calculatedStats.currencySymbol}
          />
          <AccountSummaryList accounts={transformedAccounts} />
        </div>
      </Tile>
    </div>
  );
}
