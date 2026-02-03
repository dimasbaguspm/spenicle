import type {
  AccountSearchModel,
  AccountsPagedModel,
  AccountModel,
  AccountCreateModel,
  AccountUpdateModel,
  AccountReorderModel,
  AccountDeleteModel,
  AccountStatisticsModel,
  AccountStatisticsSearchModel,
  AccountStatisticBudgetHealthModel,
  AccountStatisticBudgetHealthSearchModel,
  AccountStatisticBurnRateModel,
  AccountStatisticBurnRateSearchModel,
  AccountStatisticCashFlowPulseModel,
  AccountStatisticCashFlowPulseSearchModel,
  AccountStatisticCategoryHeatmapModel,
  AccountStatisticCategoryHeatmapSearchModel,
  AccountStatisticMonthlyVelocityModel,
  AccountStatisticMonthlyVelocitySearchModel,
  AccountStatisticTimeFrequencyModel,
  AccountStatisticTimeFrequencySearchModel,
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
  >,
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
  >,
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
  options?: Partial<UseApiQueryOptions<AccountModel, unknown, unknown>>,
) => {
  return useApiQuery<AccountModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_BY_ID(id),
    path: ENDPOINTS.ACCOUNT.BY_ID(id),
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
  return useApiMutate<void, AccountDeleteModel>({
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

// Statistics queries
export const useApiAccountStatisticsQuery = (
  id: number,
  params?: AccountStatisticsSearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountStatisticsModel, unknown, unknown>
  >,
) => {
  return useApiQuery<AccountStatisticsModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_BY_ID(id, params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.STATISTICS.BY_ID(id),
  });
};

export const useApiAccountStatisticBudgetHealthQuery = (
  id: number,
  params?: AccountStatisticBudgetHealthSearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountStatisticBudgetHealthModel, unknown, unknown>
  >,
) => {
  return useApiQuery<AccountStatisticBudgetHealthModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_STATISTICS.BUDGET_HEALTH(id, params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.STATISTICS.BUDGET_HEALTH(id),
  });
};

export const useApiAccountStatisticBurnRateQuery = (
  id: number,
  params?: AccountStatisticBurnRateSearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountStatisticBurnRateModel, unknown, unknown>
  >,
) => {
  return useApiQuery<AccountStatisticBurnRateModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_STATISTICS.BURN_RATE(id, params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.STATISTICS.BURN_RATE(id),
  });
};

export const useApiAccountStatisticCashFlowPulseQuery = (
  id: number,
  params?: AccountStatisticCashFlowPulseSearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountStatisticCashFlowPulseModel, unknown, unknown>
  >,
) => {
  return useApiQuery<AccountStatisticCashFlowPulseModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_STATISTICS.CASH_FLOW_PULSE(id, params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.STATISTICS.CASH_FLOW_PULSE(id),
  });
};

export const useApiAccountStatisticCategoryHeatmapQuery = (
  id: number,
  params?: AccountStatisticCategoryHeatmapSearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountStatisticCategoryHeatmapModel, unknown, unknown>
  >,
) => {
  return useApiQuery<AccountStatisticCategoryHeatmapModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_STATISTICS.CATEGORY_HEATMAP(id, params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.STATISTICS.CATEGORY_HEATMAP(id),
  });
};

export const useApiAccountStatisticMonthlyVelocityQuery = (
  id: number,
  params?: AccountStatisticMonthlyVelocitySearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountStatisticMonthlyVelocityModel, unknown, unknown>
  >,
) => {
  return useApiQuery<AccountStatisticMonthlyVelocityModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_STATISTICS.MONTHLY_VELOCITY(id, params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.STATISTICS.MONTHLY_VELOCITY(id),
  });
};

export const useApiAccountStatisticTimeFrequencyQuery = (
  id: number,
  params?: AccountStatisticTimeFrequencySearchModel,
  options?: Partial<
    UseApiQueryOptions<AccountStatisticTimeFrequencyModel, unknown, unknown>
  >,
) => {
  return useApiQuery<AccountStatisticTimeFrequencyModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.ACCOUNT_STATISTICS.TIME_FREQUENCY(id, params),
    queryParams: params,
    path: ENDPOINTS.ACCOUNT.STATISTICS.TIME_FREQUENCY(id),
  });
};
