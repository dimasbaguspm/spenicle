import dayjs from 'dayjs';

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
    // NOTE: This is a workaround to ensure the dates are adjusted correctly for the UI
    // because the API returns dates in UTC and we want to display them in local time.
    select: (valueData = []) => {
      return valueData.map((item) => ({
        ...item,
        startDate: dayjs(item.startDate).add(1, 'day').startOf('day').toISOString(),
        endDate: dayjs(item.endDate).add(1, 'day').endOf('day').toISOString(),
      }));
    },
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
    // NOTE: This is a workaround to ensure the dates are adjusted correctly for the UI
    // because the API returns dates in UTC and we want to display them in local time.
    select: (valueData = []) => {
      return valueData.map((item) => ({
        ...item,
        startDate: dayjs(item.startDate).add(1, 'day').startOf('day').toISOString(),
        endDate: dayjs(item.endDate).add(1, 'day').endOf('day').toISOString(),
      }));
    },
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
    // NOTE: This is a workaround to ensure the dates are adjusted correctly for the UI
    // because the API returns dates in UTC and we want to display them in local time.
    select: (valueData = []) => {
      return valueData.map((item) => ({
        ...item,
        startDate: dayjs(item.startDate).add(1, 'day').startOf('day').toISOString(),
        endDate: dayjs(item.endDate).add(1, 'day').endOf('day').toISOString(),
      }));
    },
  });
};
