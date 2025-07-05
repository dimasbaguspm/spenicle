import { useMemo } from 'react';

import type { Account } from '../../../../../types/api';
import type { EnrichedAccountData } from '../helpers/mobile-accounts-mappers';

interface UseAccountDataParams {
  data: Array<{
    accountId?: number;
    totalIncome?: number;
    totalExpenses?: number;
    totalNet?: number;
    totalTransactions?: number;
    startDate?: string;
    endDate?: string;
  }>;
  accountMap: Record<number, Account>;
}

interface UseAccountDataReturn {
  enrichedData: EnrichedAccountData[];
  hasData: boolean;
}

/**
 * Custom hook for processing account data for mobile display
 * Transforms raw summary data into enriched account information
 */
export function useAccountData({ data, accountMap }: UseAccountDataParams): UseAccountDataReturn {
  const enrichedData = useMemo((): EnrichedAccountData[] => {
    if (!data || data.length === 0) return [];

    return data.map((account) => {
      const accountObj = accountMap[account.accountId ?? -1];
      const metadata = accountObj?.metadata ?? {};

      return {
        accountId: account.accountId ?? -1,
        accountName: accountObj?.name ?? `Account #${account.accountId}`,
        iconValue: 'icon' in metadata ? metadata.icon : undefined,
        colorValue: 'color' in metadata ? metadata.color : undefined,
        totalIncome: account.totalIncome ?? 0,
        totalExpenses: account.totalExpenses ?? 0,
        totalNet: account.totalNet ?? 0,
        totalTransactions: account.totalTransactions ?? 0,
        startDate: account.startDate,
        endDate: account.endDate,
      };
    });
  }, [data, accountMap]);

  const hasData = useMemo(() => {
    return enrichedData.some((account) => account.totalTransactions > 0);
  }, [enrichedData]);

  return {
    enrichedData,
    hasData,
  };
}
