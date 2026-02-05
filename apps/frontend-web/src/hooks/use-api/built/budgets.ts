import type {
  BudgetModel,
  BudgetCreateModel,
  BudgetUpdateModel,
  BudgetDeleteModel,
  BudgetPagedModel,
  BudgetSearchModel,
} from "@/types/schemas";
import { useQueryClient } from "@tanstack/react-query";

import { ENDPOINTS } from "../constant";
import { QUERY_KEYS } from "../queries-keys";
import { useApiMutate } from "../base/use-api-mutate";
import {
  useApiInfiniteQuery,
  type UseApiInfiniteQueryOptions,
} from "../base/use-api-infinite-query";
import { useApiQuery, type UseApiQueryOptions } from "../base/use-api-query";

export const useApiBudgetsInfiniteQuery = (
  params: BudgetSearchModel,
  options?: Partial<
    UseApiInfiniteQueryOptions<BudgetModel, BudgetSearchModel, unknown>
  >,
) => {
  return useApiInfiniteQuery({
    ...options,
    queryKey: QUERY_KEYS.BUDGETS.PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.BUDGETS.PAGINATED,
  });
};

export const useApiBudgetsPaginatedQuery = (
  params: BudgetSearchModel,
  options?: Partial<
    UseApiQueryOptions<BudgetPagedModel, BudgetSearchModel, unknown>
  >,
) => {
  return useApiQuery<BudgetPagedModel, BudgetSearchModel>({
    ...options,
    queryKey: QUERY_KEYS.BUDGETS.PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.BUDGETS.PAGINATED,
  });
};

export const useApiBudgetQuery = (
  id: number,
  options?: Partial<UseApiQueryOptions<BudgetModel, unknown, unknown>>,
) => {
  return useApiQuery<BudgetModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.BUDGETS.BY_ID(id),
    path: ENDPOINTS.BUDGETS.BY_ID(id),
  });
};

export const useApiCreateBudget = () => {
  const queryClient = useQueryClient();
  return useApiMutate<BudgetModel, BudgetCreateModel>({
    path: ENDPOINTS.BUDGETS.PAGINATED,
    method: "POST",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BUDGETS.PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.BUDGETS.BY_ID(data.id), data);
    },
  });
};

export const useApiUpdateBudget = () => {
  const queryClient = useQueryClient();
  return useApiMutate<BudgetModel, BudgetUpdateModel>({
    path: ENDPOINTS.BUDGETS.BY_ID(":id"),
    method: "PATCH",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BUDGETS.PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.BUDGETS.BY_ID(data.id), data);
    },
  });
};

export const useApiDeleteBudget = () => {
  const queryClient = useQueryClient();
  return useApiMutate<void, BudgetDeleteModel>({
    path: ENDPOINTS.BUDGETS.BY_ID(":id"),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BUDGETS.PAGINATED().slice(0, 2),
        exact: false,
      });
    },
  });
};
