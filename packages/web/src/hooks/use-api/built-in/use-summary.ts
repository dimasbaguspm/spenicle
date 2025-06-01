import type { Error } from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

interface FinancialSummary {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    accountBalances: Array<{
      accountId: string;
      accountName: string;
      balance: number;
    }>;
    categoryBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      amount: number;
      type: 'income' | 'expense';
    }>;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

interface SummaryQueryParams {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
}

// Get financial summary
export const useApiSummaryQuery = (params?: SummaryQueryParams): UseApiQueryResult<FinancialSummary, Error> => {
  return useApiQuery<FinancialSummary, SummaryQueryParams, Error>({
    queryKey: QUERY_KEYS.SUMMARY.get(params),
    path: '/summary',
    queryParams: params,
  });
};
