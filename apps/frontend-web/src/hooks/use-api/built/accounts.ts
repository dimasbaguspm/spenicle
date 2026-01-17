import type {
  AccountSearchModel,
  AccountsPagedModel,
  AccountModel,
  AccountCreateModel,
  AccountUpdateModel,
  AccountReorderModel,
  AccountBudgetPagedModel,
  AccountBudgetModel,
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

export const useApiAccountsInfiniteQuery = (
  params: AccountSearchModel,
  options?: Partial<
    UseApiInfiniteQueryOptions<AccountModel, AccountSearchModel, unknown>
  >
) => {
  return useApiInfiniteQuery({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_INFINITE(params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.PAGINATED,
  });
};

export const useApiAccountsPaginatedQuery = (
  params: AccountSearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountsPagedModel, AccountSearchModel, unknown>
  >
) => {
  return useApiQuery<AccountsPagedModel, AccountSearchModel>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.PAGINATED,
  });
};

export const useApiAccountQuery = (
  id: number,
  options?: Partial<UseApiQueryOptions<AccountModel, unknown, unknown>>
) => {
  return useApiQuery<AccountModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_BY_ID(id),
    path: ENDPOINTS.ACCOUNT.BY_ID(id),
  });
};

export const useApiAccountBudgetsQuery = (
  id: number,
  options?: Partial<
    UseApiQueryOptions<AccountBudgetPagedModel, unknown, unknown>
  >
) => {
  return useApiQuery<AccountBudgetPagedModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_BY_ID(id, { includeBudgets: true }),
    path: ENDPOINTS.ACCOUNT.BY_ID_BUDGETS(id),
  });
};

export const useApiAccountBudgetDetailQuery = (
  id: number,
  budgetId: number,
  options?: Partial<UseApiQueryOptions<AccountBudgetModel, unknown, unknown>>
) => {
  return useApiQuery<AccountBudgetModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_BY_ID(id, { includeBudgetDetail: budgetId }),
    path: ENDPOINTS.ACCOUNT.BY_ID_BUDGETS_DETAIL(id, budgetId),
  });
};

export const useApiCreateAccount = () => {
  const queryClient = useQueryClient();
  return useApiMutate<AccountModel, AccountCreateModel>({
    path: ENDPOINTS.ACCOUNT.PAGINATED,
    method: "POST",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_INFINITE().slice(0, 2),
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.ACCOUNT_BY_ID(data.id), data);
    },
  });
};

export const useApiUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useApiMutate<AccountModel, AccountUpdateModel>({
    path: ENDPOINTS.ACCOUNT.BY_ID(":id"),
    method: "PATCH",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_INFINITE().slice(0, 2),
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.ACCOUNT_BY_ID(data.id), data);
    },
  });
};

export const useApiReorderAccounts = () => {
  const queryClient = useQueryClient();
  return useApiMutate<null, AccountReorderModel>({
    path: ENDPOINTS.ACCOUNT.REORDER,
    method: "POST",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_INFINITE().slice(0, 2),
        exact: false,
      });
    },
  });
};

export const useApiDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useApiMutate<{ id: number }, unknown>({
    path: ENDPOINTS.ACCOUNT.BY_ID(":id"),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_INFINITE().slice(0, 2),
        exact: false,
      });
    },
  });
};
