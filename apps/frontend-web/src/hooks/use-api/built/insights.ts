import type {
  InsightsAccountSearchModel,
  InsightsAccountsModel,
  InsightsCategoryModel,
  InsightsCategorySearchModel,
  InsightsTransactionModel,
  InsightsTransactionsSearchModel,
} from "@/types/schemas";

import { ENDPOINTS } from "../constant";
import { QUERY_KEYS } from "../queries-keys";
import { useApiQuery, type UseApiQueryOptions } from "../base/use-api-query";

export const useApiInsightsAccountsSummaryQuery = (
  params: InsightsAccountSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      InsightsAccountsModel,
      InsightsAccountSearchModel,
      unknown
    >
  >,
) => {
  return useApiQuery<InsightsAccountsModel, InsightsAccountSearchModel>({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.ACCOUNTS_SUMMARY(params),
    path: ENDPOINTS.INSIGHTS.ACCOUNTS_SUMMARY,
  });
};

export const useApiInsightsCategoriesSummaryQuery = (
  params: InsightsCategorySearchModel,
  options?: Partial<
    UseApiQueryOptions<
      InsightsCategoryModel,
      InsightsCategorySearchModel,
      unknown
    >
  >,
) => {
  return useApiQuery<InsightsCategoryModel, InsightsCategorySearchModel>({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.CATEGORIES_SUMMARY(params),
    path: ENDPOINTS.INSIGHTS.CATEGORIES_SUMMARY,
  });
};

export const useApiInsightsTransactionsSummaryQuery = (
  params: InsightsTransactionsSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      InsightsTransactionModel,
      InsightsTransactionsSearchModel,
      unknown
    >
  >,
) => {
  return useApiQuery<InsightsTransactionModel, InsightsTransactionsSearchModel>(
    {
      ...options,
      queryParams: params,
      queryKey: QUERY_KEYS.INSIGHTS.TRANSACTIONS_SUMMARY(params),
      path: ENDPOINTS.INSIGHTS.TRANSACTIONS_SUMMARY,
    },
  );
};
