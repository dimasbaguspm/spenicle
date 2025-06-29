import dayjs from 'dayjs';
import { useMemo, type FC } from 'react';

import { Tile, TextInput } from '../../../../components';
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

  const getActivityStatus = (transactions: number) => {
    if (transactions > 10) return { text: 'Very Active', color: 'text-sage-600' };
    if (transactions > 5) return { text: 'Active', color: 'text-mist-600' };
    if (transactions > 0) return { text: 'Some Activity', color: 'text-warning-600' };
    return { text: 'No Activity', color: 'text-slate-400' };
  };

  return (
    <Tile className="p-4">
      <div className="space-y-4">
        {/* integrated header with search */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Management</h3>
              <p className="text-sm text-slate-500">
                {searchQuery
                  ? `${sortedAccounts.length} of ${accounts.length} accounts`
                  : `${accounts.length} total accounts`}
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{periodLabel}</span>
          </div>

          {/* search input */}
          <TextInput
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search accounts by name or type..."
          />
        </div>

        {sortedAccounts.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <div>
                <p className="text-sm font-medium text-slate-600">No accounts found</p>
                <p className="text-xs text-slate-500">Try adjusting your search terms</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-600">No accounts yet</p>
                <p className="text-xs text-slate-500">Add your first account to get started</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAccounts.map((account) => {
              const activityStatus = getActivityStatus(account.currentPeriodTransactions);
              const hasBalance = account.amount !== undefined && account.amount !== null;
              const balanceIsPositive = (account.amount ?? 0) >= 0;

              return (
                <div
                  key={account.id}
                  onClick={() => onAccountCardClick(account)}
                  className="p-4 bg-white rounded-lg border border-mist-100 hover:border-mist-200 transition-colors cursor-pointer hover:shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <AccountIcon
                        iconValue={account.metadata?.icon ?? 'credit-card'}
                        colorValue={account.metadata?.color ?? 'coral'}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 truncate">{account.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${activityStatus.color}`}>{activityStatus.text}</span>
                          {account.currentPeriodTransactions > 0 && <span className="text-xs text-slate-400">•</span>}
                          {account.currentPeriodTransactions > 0 && (
                            <span className="text-xs text-slate-500">
                              {account.currentPeriodTransactions} transaction
                              {account.currentPeriodTransactions !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Account Balance - Primary Metric */}
                    {hasBalance && (
                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-sm font-semibold ${balanceIsPositive ? 'text-slate-900' : 'text-coral-600'}`}
                        >
                          {formatAmount(account.amount ?? 0, { compact: true, hidePrefix: true })}
                        </div>
                        <div className="text-xs text-slate-500">Balance</div>
                      </div>
                    )}
                  </div>

                  {/* Current Period Activity Details */}
                  {account.currentPeriodTransactions > 0 && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-mist-100">
                      <div className="text-center">
                        <p className="text-xs text-slate-500">{periodLabel} Income</p>
                        <p className="text-sm font-semibold text-sage-600">
                          {formatAmount(account.currentPeriodIncome, { compact: true, hidePrefix: true })}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-slate-500">{periodLabel} Expenses</p>
                        <p className="text-sm font-semibold text-coral-600">
                          {formatAmount(account.currentPeriodExpenses, { compact: true, hidePrefix: true })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Tile>
  );
};
