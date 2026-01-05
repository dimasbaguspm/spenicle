import type {
  InsightsAccountSearchModel,
  InsightsAccountsModel,
  InsightsAccountTrendsModel,
  InsightsAccountTrendsSearchModel,
  InsightsCategoriesTrendsModel,
  InsightsCategoriesTrendsSearchModel,
  InsightsCategoryModel,
  InsightsCategorySearchModel,
  InsightsTagsModel,
  InsightsTagsSearchModel,
  InsightsTotalModel,
  InsightsTotalSearchModel,
  InsightsTransactionModel,
  InsightsTransactionsSearchModel,
} from "@/types/schemas";

import { ENDPOINTS } from "../constant";
import { QUERY_KEYS } from "../queries-keys";
import { useApiQuery, type UseApiQueryOptions } from "../base/use-api-query";

export const useApiInsightsAccountSummaryQuery = (
  params: InsightsAccountSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      InsightsAccountsModel,
      InsightsAccountSearchModel,
      unknown
    >
  >
) => {
  return useApiQuery<InsightsAccountsModel, InsightsAccountSearchModel>({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.ACCOUNTS_SUMMARY(params),
    path: ENDPOINTS.INSIGHTS.ACCOUNTS_SUMMARY,
  });
};

export const useApiInsightsAccountsTrendsQuery = (
  params: InsightsAccountTrendsSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      InsightsAccountTrendsModel,
      InsightsAccountTrendsSearchModel,
      unknown
    >
  >
) => {
  return useApiQuery<
    InsightsAccountTrendsModel,
    InsightsAccountTrendsSearchModel
  >({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.ACCOUNTS_TRENDS(params),
    path: ENDPOINTS.INSIGHTS.ACCOUNTS_SPENDING_TRENDS,
  });
};

export const useApiInsightsCategoriesSummaryQuery = (
  params: InsightsCategoriesTrendsSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      InsightsCategoryModel,
      InsightsCategorySearchModel,
      unknown
    >
  >
) => {
  return useApiQuery<InsightsCategoryModel, InsightsCategorySearchModel>({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.CATEGORIES_SUMMARY(params),
    path: ENDPOINTS.INSIGHTS.CATEGORIES_SUMMARY,
  });
};

export const useApiInsightsCategoriesTrendsQuery = (
  params: InsightsCategoriesTrendsSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      InsightsCategoriesTrendsModel,
      InsightsCategoriesTrendsSearchModel,
      unknown
    >
  >
) => {
  return useApiQuery<
    InsightsCategoriesTrendsModel,
    InsightsCategoriesTrendsSearchModel
  >({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.CATEGORIES_TRENDS(params),
    path: ENDPOINTS.INSIGHTS.CATEGORIES_SPENDING_TRENDS,
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
  >
) => {
  return useApiQuery<InsightsTransactionModel, InsightsTransactionsSearchModel>(
    {
      ...options,
      queryParams: params,
      queryKey: QUERY_KEYS.INSIGHTS.TRANSACTIONS_SUMMARY(params),
      path: ENDPOINTS.INSIGHTS.TRANSACTIONS_SUMMARY,
    }
  );
};

export const useApiInsightsTagsSummaryQuery = (
  params: InsightsTagsSearchModel,
  options?: Partial<
    UseApiQueryOptions<InsightsTagsModel, InsightsTagsSearchModel, unknown>
  >
) => {
  return useApiQuery<InsightsTagsModel, InsightsTagsSearchModel>({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.TAGS_SUMMARY(params),
    path: ENDPOINTS.INSIGHTS.TAGS_SUMMARY,
  });
};

export const useApiInsightsTotalSummaryQuery = (
  params: InsightsTotalSearchModel,
  options?: Partial<
    UseApiQueryOptions<InsightsTotalModel, InsightsTotalSearchModel, unknown>
  >
) => {
  return useApiQuery<InsightsTotalModel, InsightsTotalSearchModel>({
    ...options,
    queryParams: params,
    queryKey: QUERY_KEYS.INSIGHTS.TOTAL_SUMMARY(params),
    path: ENDPOINTS.INSIGHTS.TOTAL_SUMMARY,
  });
};
