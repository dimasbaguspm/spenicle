import type {
  BudgetModel,
  BudgetRelatedSearchModel,
  BudgetTemplateModel,
  BudgetTemplateCreateModel,
  BudgetTemplateUpdateModel,
  BudgetTemplatePagedModel,
  BudgetTemplateSearchModel,
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
  params: BudgetTemplateSearchModel,
  options?: Partial<
    UseApiInfiniteQueryOptions<
      BudgetTemplateModel,
      BudgetTemplateSearchModel,
      unknown
    >
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
  params: BudgetTemplateSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      BudgetTemplatePagedModel,
      BudgetTemplateSearchModel,
      unknown
    >
  >,
) => {
  return useApiQuery<BudgetTemplatePagedModel, BudgetTemplateSearchModel>({
    ...options,
    queryKey: QUERY_KEYS.BUDGETS.PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.BUDGETS.PAGINATED,
  });
};

export const useApiBudgetQuery = (
  id: number,
  options?: Partial<UseApiQueryOptions<BudgetTemplateModel, unknown, unknown>>,
) => {
  return useApiQuery<BudgetTemplateModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.BUDGETS.BY_ID(id),
    path: ENDPOINTS.BUDGETS.BY_ID(id),
  });
};

export const useApiCreateBudget = () => {
  const queryClient = useQueryClient();
  return useApiMutate<BudgetTemplateModel, BudgetTemplateCreateModel>({
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
  return useApiMutate<BudgetTemplateModel, BudgetTemplateUpdateModel>({
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

export const useApiRelatedBudgetsInfiniteQuery = (
  templateId: number,
  params: Omit<BudgetRelatedSearchModel, "id">,
  options?: Partial<
    UseApiInfiniteQueryOptions<
      BudgetModel,
      Omit<BudgetRelatedSearchModel, "id">,
      unknown
    >
  >,
) => {
  return useApiInfiniteQuery<BudgetModel, Omit<BudgetRelatedSearchModel, "id">>(
    {
      ...options,
      queryKey: QUERY_KEYS.BUDGETS.RELATED(templateId, params),
      queryParams: params,
      path: ENDPOINTS.BUDGETS.RELATED_BUDGETS(templateId),
    },
  );
};

export const useApiGeneratedBudgetQuery = (
  templateId: number,
  budgetId: number,
  options?: Partial<UseApiQueryOptions<BudgetModel, unknown, unknown>>,
) => {
  return useApiQuery<BudgetModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.BUDGETS.GENERATED_BY_ID(templateId, budgetId),
    path: ENDPOINTS.BUDGETS.GENERATED_BUDGET(templateId, budgetId),
  });
};

export const useApiUpdateGeneratedBudget = () => {
  const queryClient = useQueryClient();
  return useApiMutate<
    BudgetModel,
    { templateId: number; budgetId: number; amountLimit?: number }
  >({
    path: ENDPOINTS.BUDGETS.GENERATED_BUDGET_UPDATE(":templateId", ":budgetId"),
    method: "PATCH",
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BUDGETS.RELATED(variables.templateId, {}),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BUDGETS.PAGINATED().slice(0, 2),
        exact: false,
      });
    },
  });
};
