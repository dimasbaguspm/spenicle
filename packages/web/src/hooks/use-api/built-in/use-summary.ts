import type {
  Error,
  SummaryAccountsPeriod,
  SummaryPeriodQueryParameters,
  SummaryTransactionsPeriod,
} from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

export const useApiSummaryTransactionsQuery = (
  params?: SummaryPeriodQueryParameters
): UseApiQueryResult<SummaryTransactionsPeriod, Error> => {
  return useApiQuery<SummaryTransactionsPeriod, SummaryPeriodQueryParameters, Error>({
    queryKey: QUERY_KEYS.SUMMARY.transactions(params),
    path: '/summary/transactions-period',
    queryParams: params,
  });
};

export const useApiSummaryAccountsQuery = (
  params?: SummaryPeriodQueryParameters
): UseApiQueryResult<SummaryAccountsPeriod, Error> => {
  return useApiQuery<SummaryAccountsPeriod, SummaryPeriodQueryParameters, Error>({
    queryKey: QUERY_KEYS.SUMMARY.accounts(params),
    path: '/summary/accounts-period',
    queryParams: params,
  });
};

export const useApiSummaryCategoriesQuery = (
  params?: SummaryPeriodQueryParameters
): UseApiQueryResult<SummaryAccountsPeriod, Error> => {
  return useApiQuery<SummaryAccountsPeriod, SummaryPeriodQueryParameters, Error>({
    queryKey: QUERY_KEYS.SUMMARY.categories(params),
    path: '/summary/categories-period',
    queryParams: params,
  });
};
