import { Badge, Text, TextInput, Tile, type BadgeProps } from '@dimasbaguspm/versaur';
import dayjs from 'dayjs';
import { useMemo, type FC } from 'react';

import { useApiSummaryAccountsQuery } from '../../../../hooks';
import { formatAmount } from '../../../../libs/format-amount';
import type { Account } from '../../../../types/api';
import { useAccountsSearch } from '../../hooks';
import { AccountIcon } from '../account-icon';

import type { PeriodType } from './mobile-account-insights-widget';

interface MobileAccountSummarySectionProps {
  accounts: Account[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAccountCardClick: (account: Account) => void;
  selectedPeriod: PeriodType;
}

interface AccountWithMetrics extends Account {
  currentPeriodExpenses: number;
  currentPeriodIncome: number;
  currentPeriodTransactions: number;
}

/**
 * MobileAccountSummarySection displays accounts in a mobile-optimized list format.
 * Includes integrated search functionality and shows account balances prominently.
 * Displays current period income/expenses for activity context with enhanced visual design.
 * Account cards are clickable and trigger the onAccountCardClick callback for editing.
 */
export const MobileAccountSummarySection: FC<MobileAccountSummarySectionProps> = ({
  accounts,
  searchQuery,
  onSearchChange,
  onAccountCardClick,
  selectedPeriod,
}) => {
  const now = dayjs();

  // calculate date ranges for the selected period
  const { startDate, endDate, periodLabel } = useMemo(() => {
    switch (selectedPeriod) {
      case 'today':
        return {
          startDate: now.startOf('day').toISOString(),
          endDate: now.endOf('day').toISOString(),
          periodLabel: 'Today',
        };
      case 'week':
        return {
          startDate: now.startOf('week').toISOString(),
          endDate: now.endOf('week').toISOString(),
          periodLabel: 'This Week',
        };
      case 'month':
      default:
        return {
          startDate: now.startOf('month').toISOString(),
          endDate: now.endOf('month').toISOString(),
          periodLabel: now.format('MMM YYYY'),
        };
    }
  }, [selectedPeriod, now]);

  // fetch current period summary for metrics
  const [summaryData] = useApiSummaryAccountsQuery({
    startDate,
    endDate,
  });

  // use the custom hook for search functionality
  const { filteredAccounts } = useAccountsSearch({
    accounts,
    searchQuery,
  });

  // enhance accounts with current month metrics
  const enhancedAccounts = useMemo((): AccountWithMetrics[] => {
    if (!summaryData) return filteredAccounts as AccountWithMetrics[];

    const summaryMap = new Map(summaryData.map((s) => [s.accountId, s]));

    return filteredAccounts.map((account) => {
      const summary = summaryMap.get(account.id);
      const currentPeriodExpenses = summary?.totalExpenses ?? 0;
      const currentPeriodIncome = summary?.totalIncome ?? 0;
      const currentPeriodTransactions = summary?.totalTransactions ?? 0;

      return {
        ...account,
        currentPeriodExpenses,
        currentPeriodIncome,
        currentPeriodTransactions,
      };
    });
  }, [filteredAccounts, summaryData]);

  // sort accounts by current period activity for mobile relevance
  const sortedAccounts = useMemo(() => {
    return [...enhancedAccounts].sort((a, b) => {
      // prioritize accounts with recent activity
      if (a.currentPeriodTransactions !== b.currentPeriodTransactions) {
        return b.currentPeriodTransactions - a.currentPeriodTransactions;
      }
      // then sort alphabetically
      return (a.name ?? '').localeCompare(b.name ?? '');
    });
  }, [enhancedAccounts]);

  const getActivityStatus = (transactions: number): { text: string; color: BadgeProps['color'] } => {
    if (transactions > 10) return { text: 'Very Active', color: 'success' };
    if (transactions > 5) return { text: 'Active', color: 'success' };
    if (transactions > 0) return { text: 'Some Activity', color: 'warning' };
    return { text: 'No Activity', color: 'neutral' };
  };

  return (
    <Tile>
      <div className="space-y-4">
        {/* integrated header with search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Text as="h3" fontSize="lg" fontWeight="semibold">
                Management
              </Text>
              <Text as="p" fontSize="sm">
                {searchQuery
                  ? `${sortedAccounts.length} of ${accounts.length} accounts`
                  : `${accounts.length} total accounts`}
              </Text>
            </div>
            <Badge color="neutral" size="sm" shape="rounded" className="px-2">
              {periodLabel}
            </Badge>
          </div>

          {/* search input */}
          <TextInput
            variant="ghost"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search accounts by name or type..."
          />
        </div>

        {sortedAccounts.length === 0 ? (
          <div className="py-8">
            {searchQuery ? (
              <div>
                <Text as="p" fontSize="sm" fontWeight="medium" align="center">
                  No accounts found
                </Text>
                <Text as="p" fontSize="xs" align="center">
                  Try adjusting your search terms
                </Text>
              </div>
            ) : (
              <div>
                <Text fontSize="sm" fontWeight="medium" align="center">
                  No accounts yet
                </Text>
                <Text fontSize="xs" align="center">
                  Add your first account to get started
                </Text>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAccounts.map((account) => {
              const activityStatus = getActivityStatus(account.currentPeriodTransactions);
              const hasActivity = account.currentPeriodTransactions > 0;
              const hasBalance = account.amount !== undefined && account.amount !== null;
              const balanceIsPositive = (account.amount ?? 0) >= 0;

              return (
                <Tile key={account.id} onClick={() => onAccountCardClick(account)}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <AccountIcon
                        iconValue={account.metadata?.icon ?? 'credit-card'}
                        colorValue={account.metadata?.color ?? 'coral'}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Text as="h4" fontSize="sm" fontWeight="medium" ellipsis clamp={1}>
                          {account.name}
                        </Text>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge size="sm" color={activityStatus.color}>
                            {activityStatus.text}
                          </Badge>
                          {hasActivity && (
                            <Text as="span" fontSize="xs">
                              •
                            </Text>
                          )}
                          {hasActivity && (
                            <Text as="span" fontSize="xs">
                              {account.currentPeriodTransactions} transaction
                              {account.currentPeriodTransactions !== 1 ? 's' : ''}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Smart visual indicator for account balance */}
                    <div className="flex-shrink-0 ml-2">
                      {hasBalance && (
                        <>
                          <Text as="p" fontSize="xs" align="right">
                            Balance
                          </Text>
                          <Text as="p" fontSize="sm" fontWeight="semibold" align="right">
                            {formatAmount(account.amount ?? 0, { compact: true, hidePrefix: balanceIsPositive })}
                          </Text>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Current Period Activity Details */}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                    <Tile size="xs" variant="secondary">
                      <Text as="p" fontSize="xs" color="secondary" align="center" fontWeight="medium">
                        Income
                      </Text>
                      <Text as="p" fontSize="lg" fontWeight="bold" color="secondary" align="center">
                        {formatAmount(account.currentPeriodIncome, { compact: true, hidePrefix: true })}
                      </Text>
                    </Tile>
                    <Tile variant="primary" size="xs">
                      <Text as="p" fontSize="xs" color="primary" align="center" fontWeight="medium">
                        Expenses
                      </Text>
                      <Text as="p" fontSize="lg" fontWeight="bold" color="primary" align="center">
                        {formatAmount(account.currentPeriodExpenses, { compact: true, hidePrefix: true })}
                      </Text>
                    </Tile>
                  </div>
                </Tile>
              );
            })}
          </div>
        )}
      </div>
    </Tile>
  );
};
