import type {
  Error,
  SummaryAccountsPeriod,
  SummaryCategoriesPeriod,
  SummaryPeriodQueryParameters,
  SummaryTransactionsPeriod,
} from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiQuery, type UseApiQueryResult, type UseApiQueryOptions } from '../use-api-query';

export const useApiSummaryTransactionsQuery = (
  params?: SummaryPeriodQueryParameters,
  options?: Partial<UseApiQueryOptions<SummaryTransactionsPeriod, SummaryPeriodQueryParameters, Error>>
): UseApiQueryResult<SummaryTransactionsPeriod, Error> => {
  return useApiQuery<SummaryTransactionsPeriod, SummaryPeriodQueryParameters, Error>({
    ...options,
    queryKey: QUERY_KEYS.SUMMARY.transactions(params),
    path: '/summary/transactions-period',
    queryParams: params,
  });
};

export const useApiSummaryAccountsQuery = (
  params?: SummaryPeriodQueryParameters,
  options?: Partial<UseApiQueryOptions<SummaryAccountsPeriod, SummaryPeriodQueryParameters, Error>>
): UseApiQueryResult<SummaryAccountsPeriod, Error> => {
  return useApiQuery<SummaryAccountsPeriod, SummaryPeriodQueryParameters, Error>({
    ...options,
    queryKey: QUERY_KEYS.SUMMARY.accounts(params),
    path: '/summary/accounts-period',
    queryParams: params,
  });
};

export const useApiSummaryCategoriesQuery = (
  params?: SummaryPeriodQueryParameters,
  options?: Partial<UseApiQueryOptions<SummaryCategoriesPeriod, SummaryPeriodQueryParameters, Error>>
): UseApiQueryResult<SummaryCategoriesPeriod, Error> => {
  return useApiQuery<SummaryCategoriesPeriod, SummaryPeriodQueryParameters, Error>({
    ...options,
    queryKey: QUERY_KEYS.SUMMARY.categories(params),
    path: '/summary/categories-period',
    queryParams: params,
  });
};
