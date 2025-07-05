import { List, Grid3X3, Search, X } from 'lucide-react';
import React, { useState } from 'react';

import { Tile, IconButton, TextInput } from '../../../../../components';
import { formatAmount } from '../../../../../libs/format-amount';
import type { Account } from '../../../../../types/api';
import { AccountIcon } from '../../../../account-module/components/account-icon/account-icon';
import type { EnrichedAccountData } from '../helpers/mobile-accounts-mappers';

interface MobileAccountsTableProps {
  data: EnrichedAccountData[];
  accounts: Account[];
  chartType: 'expenses' | 'income';
  onAccountClick?: (accountId: number) => void;
}

/**
 * Mobile-optimized table for accounts data
 * Uses card-based layout with compact/detailed view options
 */
export const MobileAccountsTable: React.FC<MobileAccountsTableProps> = ({
  data,
  accounts,
  chartType,
  onAccountClick,
}) => {
  const [isCompactView, setIsCompactView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // build account map for quick lookup
  const accountMap = React.useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        if (account.id) {
          acc[account.id] = account;
        }
        return acc;
      },
      {} as Record<number, Account>
    );
  }, [accounts]);

  // filter accounts based on search query
  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((accountData) => {
      const account = accountMap[accountData.accountId];
      return account?.name?.toLowerCase().includes(query);
    });
  }, [data, searchQuery, accountMap]);

  // sort accounts by the selected chart type (highest first)
  const sortedData = React.useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const valueA = chartType === 'expenses' ? a.totalExpenses : a.totalIncome;
      const valueB = chartType === 'expenses' ? b.totalExpenses : b.totalIncome;
      return valueB - valueA;
    });
  }, [filteredData, chartType]);

  const chartTypeLabel = chartType === 'expenses' ? 'expenses' : 'income';

  return (
    <Tile className="p-4">
      <div className="space-y-4">
        {/* header with view toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Account Details</h3>
            <p className="text-sm text-slate-500">
              Financial metrics for {filteredData.length} accounts, sorted by highest {chartTypeLabel}
            </p>
          </div>

          {/* view toggle for mobile */}
          <div className="flex items-center gap-1 bg-mist-100 rounded-lg p-1 flex-shrink-0">
            <IconButton
              variant={isCompactView ? 'mist-ghost' : 'mist'}
              size="sm"
              onClick={() => setIsCompactView(false)}
              aria-label="Detailed view"
            >
              <List className="h-4 w-4" />
            </IconButton>
            <IconButton
              variant={isCompactView ? 'mist' : 'mist-ghost'}
              size="sm"
              onClick={() => setIsCompactView(true)}
              aria-label="Compact view"
            >
              <Grid3X3 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {/* search bar for filtering accounts */}
        <div className="relative">
          <TextInput
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            size="sm"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* accounts list */}
        {sortedData.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <div>
                <p className="text-sm font-medium text-slate-600">No accounts found</p>
                <p className="text-xs text-slate-500">Try adjusting your search terms</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-600">No account data available</p>
                <p className="text-xs text-slate-500">Add some transactions to see account metrics</p>
              </div>
            )}
          </div>
        ) : (
          <div className={`space-y-${isCompactView ? '2' : '3'}`}>
            {sortedData.map((accountData) => {
              const account = accountMap[accountData.accountId];
              const primaryValue = chartType === 'expenses' ? accountData.totalExpenses : accountData.totalIncome;
              const primaryColorClass = chartType === 'expenses' ? 'text-coral-600' : 'text-sage-600';

              if (!account) return null;

              if (isCompactView) {
                // compact card view - smaller cards in grid
                return (
                  <div
                    key={accountData.accountId}
                    className={`p-3 rounded-lg border border-mist-200 bg-white transition-all duration-200 ${
                      onAccountClick ? 'cursor-pointer hover:border-mist-300 hover:bg-mist-25 hover:shadow-sm' : ''
                    }`}
                    onClick={() => onAccountClick?.(accountData.accountId)}
                  >
                    <div className="flex items-center justify-between">
                      {/* account info - compact */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <AccountIcon
                          iconValue={account?.metadata?.icon}
                          colorValue={account?.metadata?.color}
                          size="sm"
                          className="flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-slate-900 truncate leading-tight">
                            {accountData.accountName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {accountData.totalTransactions} transaction{accountData.totalTransactions === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>

                      {/* primary value */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-semibold tabular-nums ${primaryColorClass}`}>
                          {formatAmount(primaryValue, { compact: false, hidePrefix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // detailed card view - full width cards with better spacing
              return (
                <div
                  key={accountData.accountId}
                  className={`p-4 rounded-xl border border-mist-200 bg-white transition-all duration-200 ${
                    onAccountClick ? 'cursor-pointer hover:border-mist-300 hover:bg-mist-25 hover:shadow-sm' : ''
                  }`}
                  onClick={() => onAccountClick?.(accountData.accountId)}
                >
                  <div className="flex items-center justify-between">
                    {/* account info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <AccountIcon
                        iconValue={account?.metadata?.icon}
                        colorValue={account?.metadata?.color}
                        size="md"
                        className="flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate leading-tight">
                          {accountData.accountName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {accountData.totalTransactions} transaction{accountData.totalTransactions === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    {/* primary value */}
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${primaryColorClass}`}>
                        {formatAmount(primaryValue, { compact: false, hidePrefix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Tile>
  );
};
