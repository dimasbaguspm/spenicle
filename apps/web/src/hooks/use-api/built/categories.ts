import type {
  CategorySearchModel,
  CategoriesPagedModel,
  CategoryModel,
  CategoryCreateModel,
  CategoryUpdateModel,
  CategoryReorderModel,
  CategoryBudgetPagedModel,
  CategoryBudgetModel,
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
  >
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
  >
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
  options?: Partial<UseApiQueryOptions<CategoryModel, unknown, unknown>>
) => {
  return useApiQuery<CategoryModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_BY_ID(id),
    path: ENDPOINTS.CATEGORIES.BY_ID(id),
  });
};

export const useApiCategoryBudgetsQuery = (
  id: number,
  options?: Partial<
    UseApiQueryOptions<CategoryBudgetPagedModel, unknown, unknown>
  >
) => {
  return useApiQuery<CategoryBudgetPagedModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_BY_ID(id, { includeBudgets: true }),
    path: ENDPOINTS.CATEGORIES.BY_ID_BUDGETS(id),
  });
};

export const useApiCategoryBudgetDetailQuery = (
  id: number,
  budgetId: number,
  options?: Partial<UseApiQueryOptions<CategoryBudgetModel, unknown, unknown>>
) => {
  return useApiQuery<CategoryBudgetModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.CATEGORY_BY_ID(id, { includeBudgetDetail: budgetId }),
    path: ENDPOINTS.CATEGORIES.BY_ID_BUDGETS_DETAIL(id, budgetId),
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
  return useApiMutate<{ id: number }, unknown>({
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
