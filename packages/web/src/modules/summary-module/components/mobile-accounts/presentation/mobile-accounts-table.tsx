import { ButtonIcon, Icon, Text, TextInput, Tile } from '@dimasbaguspm/versaur';
import { Search, X } from 'lucide-react';
import React, { useState } from 'react';

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
    <Tile className="space-y-4">
      {/* header with view toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Text as="h3" fontSize="lg" fontWeight="semibold">
            Accounts Details
          </Text>
          <Text as="p" fontSize="sm">
            Financial metrics for {filteredData.length} accounts, sorted by highest {chartTypeLabel}
          </Text>
        </div>
      </div>

      {/* search bar for filtering accounts */}
      <div className="relative">
        <TextInput
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        <Icon
          as={Search}
          size="sm"
          color={searchQuery ? 'primary' : 'ghost'}
          className="absolute left-3 top-1/2 transform -translate-y-1/2"
        />
        {searchQuery && (
          <ButtonIcon
            as={X}
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear search"
          />
        )}
      </div>

      {/* accounts list */}
      {sortedData.length === 0 ? (
        <div className="text-center py-8">
          {searchQuery ? (
            <>
              <Text as="p" fontSize="sm" fontWeight="medium" align="center">
                No accounts found
              </Text>
              <Text as="p" fontSize="xs" align="center">
                Try adjusting your search terms
              </Text>
            </>
          ) : (
            <>
              <Text as="p" fontSize="sm" fontWeight="medium" align="center">
                No account data available
              </Text>
              <Text as="p" fontSize="xs" align="center">
                Add some transactions to see account metrics
              </Text>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedData.map((accountData) => {
            const account = accountMap[accountData.accountId];
            const primaryValue = chartType === 'expenses' ? accountData.totalExpenses : accountData.totalIncome;
            const color = chartType === 'expenses' ? 'primary' : 'secondary';

            if (!account) return null;

            // detailed card view - full width cards with better spacing
            return (
              <Tile key={accountData.accountId} onClick={() => onAccountClick?.(accountData.accountId)}>
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
                      <Text as="p" fontSize="sm" fontWeight="medium" ellipsis clamp={1}>
                        {accountData.accountName}
                      </Text>
                      <Text as="p" fontSize="xs">
                        {accountData.totalTransactions} transaction{accountData.totalTransactions === 1 ? '' : 's'}
                      </Text>
                    </div>
                  </div>

                  <Text as="p" fontSize="sm" fontWeight="semibold" align="right" color={color}>
                    {formatAmount(primaryValue, { compact: false, hidePrefix: true })}
                  </Text>
                </div>
              </Tile>
            );
          })}
        </div>
      )}
    </Tile>
  );
};
