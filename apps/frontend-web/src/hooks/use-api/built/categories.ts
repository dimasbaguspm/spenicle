import type {
  CategorySearchModel,
  CategoriesPagedModel,
  CategoryModel,
  CategoryCreateModel,
  CategoryUpdateModel,
  CategoryReorderModel,
  CategoryDeleteModel,
  CategoryStatisticsModel,
  CategoryStatisticsSearchModel,
  CategoryStatisticAccountDistributionModel,
  CategoryStatisticAccountDistributionSearchModel,
  CategoryStatisticAverageTransactionSizeModel,
  CategoryStatisticAverageTransactionSizeSearchModel,
  CategoryStatisticBudgetUtilizationModel,
  CategoryStatisticBudgetUtilizationSearchModel,
  CategoryStatisticDayOfWeekPatternModel,
  CategoryStatisticDayOfWeekPatternSearchModel,
  CategoryStatisticSpendingVelocityModel,
  CategoryStatisticSpendingVelocitySearchModel,
} from "@/types/schemas";
import { useQueryClient } from "@tanstack/react-query";

import { ENDPOINTS } from "../constant";
import { QUERY_KEYS } from "../queries-keys";
import {
  useApiInfiniteQuery,
  type UseApiInfiniteQueryOptions,
} from "../base/use-api-infinite-query";
import { useApiMutate } from "../base/use-api-mutate";
import { useApiQuery, type UseApiQueryOptions } from "../base/use-api-query";

export const useApiCategoriesInfiniteQuery = (
  params: CategorySearchModel,
  options?: Partial<
    UseApiInfiniteQueryOptions<CategoryModel, CategorySearchModel, unknown>
  >,
) => {
  return useApiInfiniteQuery({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_INFINITE(params),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.PAGINATED,
  });
};

export const useApiCategoriesPaginatedQuery = (
  params: CategorySearchModel,
  options?: Partial<
    UseApiQueryOptions<CategoriesPagedModel, CategorySearchModel, unknown>
  >,
) => {
  return useApiQuery<CategoriesPagedModel, CategorySearchModel>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.PAGINATED,
  });
};

export const useApiCategoryQuery = (
  id: number,
  options?: Partial<UseApiQueryOptions<CategoryModel, unknown, unknown>>,
) => {
  return useApiQuery<CategoryModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_BY_ID(id),
    path: ENDPOINTS.CATEGORIES.BY_ID(id),
  });
};

export const useApiCreateCategory = () => {
  const queryClient = useQueryClient();
  return useApiMutate<CategoryModel, CategoryCreateModel>({
    path: ENDPOINTS.CATEGORIES.PAGINATED,
    method: "POST",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_INFINITE().slice(0, 2),
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.CATEGORY_BY_ID(data.id), data);
    },
  });
};

export const useApiUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useApiMutate<CategoryModel, CategoryUpdateModel>({
    path: ENDPOINTS.CATEGORIES.BY_ID(":id"),
    method: "PATCH",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_INFINITE().slice(0, 2),
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.CATEGORY_BY_ID(data.id), data);
    },
  });
};

export const useApiReorderCategories = () => {
  const queryClient = useQueryClient();
  return useApiMutate<null, CategoryReorderModel>({
    path: ENDPOINTS.CATEGORIES.REORDER,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_INFINITE().slice(0, 2),
        exact: false,
      });
    },
  });
};

export const useApiDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useApiMutate<void, CategoryDeleteModel>({
    path: ENDPOINTS.CATEGORIES.BY_ID(":id"),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CATEGORY_INFINITE().slice(0, 2),
        exact: false,
      });
    },
  });
};

// Statistics queries
export const useApiCategoryStatisticsQuery = (
  id: number,
  params: CategoryStatisticsSearchModel,
  options?: Partial<
    UseApiQueryOptions<CategoryStatisticsModel, unknown, unknown>
  >,
) => {
  return useApiQuery<CategoryStatisticsModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_BY_ID(id, params),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.STATISTICS.BY_ID(id),
  });
};

export const useApiCategoryStatisticBudgetUtilizationQuery = (
  id: number,
  params: CategoryStatisticBudgetUtilizationSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      CategoryStatisticBudgetUtilizationModel,
      unknown,
      unknown
    >
  >,
) => {
  return useApiQuery<CategoryStatisticBudgetUtilizationModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_STATISTICS.BUDGET_UTILIZATION(id, params),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.STATISTICS.BUDGET_UTILIZATION(id),
  });
};

export const useApiCategoryStatisticAccountDistributionQuery = (
  id: number,
  params: CategoryStatisticAccountDistributionSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      CategoryStatisticAccountDistributionModel,
      unknown,
      unknown
    >
  >,
) => {
  return useApiQuery<CategoryStatisticAccountDistributionModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_STATISTICS.ACCOUNT_DISTRIBUTION(id, params),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.STATISTICS.ACCOUNT_DISTRIBUTION(id),
  });
};

export const useApiCategoryStatisticAverageTransactionSizeQuery = (
  id: number,
  params: CategoryStatisticAverageTransactionSizeSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      CategoryStatisticAverageTransactionSizeModel,
      unknown,
      unknown
    >
  >,
) => {
  return useApiQuery<CategoryStatisticAverageTransactionSizeModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_STATISTICS.AVERAGE_TRANSACTION_SIZE(
      id,
      params,
    ),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.STATISTICS.AVERAGE_TRANSACTION_SIZE(id),
  });
};

export const useApiCategoryStatisticDayOfWeekPatternQuery = (
  id: number,
  params: CategoryStatisticDayOfWeekPatternSearchModel,
  options?: Partial<
    UseApiQueryOptions<CategoryStatisticDayOfWeekPatternModel, unknown, unknown>
  >,
) => {
  return useApiQuery<CategoryStatisticDayOfWeekPatternModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_STATISTICS.DAY_OF_WEEK_PATTERN(id, params),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.STATISTICS.DAY_OF_WEEK_PATTERN(id),
  });
};

export const useApiCategoryStatisticSpendingVelocityQuery = (
  id: number,
  params: CategoryStatisticSpendingVelocitySearchModel,
  options?: Partial<
    UseApiQueryOptions<CategoryStatisticSpendingVelocityModel, unknown, unknown>
  >,
) => {
  return useApiQuery<CategoryStatisticSpendingVelocityModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_STATISTICS.SPENDING_VELOCITY(id, params),
    queryParams: params,
    path: ENDPOINTS.CATEGORIES.STATISTICS.SPENDING_VELOCITY(id),
  });
};
