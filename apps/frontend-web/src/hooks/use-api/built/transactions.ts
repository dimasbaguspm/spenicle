import type {
  TransactionSearchModel,
  TransactionsPagedModel,
  TransactionModel,
  TransactionCreateModel,
  TransactionUpdateModel,
  TransactionDeleteModel,
} from "@/types/schemas";
import { useQueryClient } from "@tanstack/react-query";

import { BASE_QUERY_KEYS, ENDPOINTS } from "../constant";
import { QUERY_KEYS } from "../queries-keys";
import {
  useApiInfiniteQuery,
  type UseApiInfiniteQueryOptions,
} from "../base/use-api-infinite-query";
import { useApiMutate } from "../base/use-api-mutate";
import { useApiQuery, type UseApiQueryOptions } from "../base/use-api-query";

export const useApiTransactionsInfiniteQuery = (
  params: TransactionSearchModel,
  options?: Partial<
    UseApiInfiniteQueryOptions<
      TransactionModel,
      TransactionSearchModel,
      unknown
    >
  >,
) => {
  return useApiInfiniteQuery({
    ...options,
    queryKey: QUERY_KEYS.TRANSACTIONS.INFINITE(params),
    queryParams: params,
    path: ENDPOINTS.TRANSACTIONS.PAGINATED,
  });
};

export const useApiTransactionsPaginatedQuery = (
  params: TransactionSearchModel,
  options?: Partial<
    UseApiQueryOptions<TransactionsPagedModel, TransactionSearchModel, unknown>
  >,
) => {
  return useApiQuery<TransactionsPagedModel, TransactionSearchModel>({
    ...options,
    queryKey: QUERY_KEYS.TRANSACTIONS.PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.TRANSACTIONS.PAGINATED,
  });
};

export const useApiTransactionQuery = (
  id: number,
  options?: Partial<UseApiQueryOptions<TransactionModel, unknown, unknown>>,
) => {
  return useApiQuery<TransactionModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.TRANSACTIONS.BY_ID(id),
    path: ENDPOINTS.TRANSACTIONS.BY_ID(id),
  });
};

export const useApiCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useApiMutate<TransactionModel, TransactionCreateModel>({
    path: ENDPOINTS.TRANSACTIONS.PAGINATED,
    method: "POST",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.INFINITE().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: BASE_QUERY_KEYS.INSIGHTS,
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.TRANSACTIONS.BY_ID(data.id), data);
    },
  });
};

export const useApiUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useApiMutate<TransactionModel, TransactionUpdateModel>({
    path: ENDPOINTS.TRANSACTIONS.BY_ID(":id"),
    method: "PATCH",
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.INFINITE().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: BASE_QUERY_KEYS.INSIGHTS,
        exact: false,
      });
      queryClient.setQueryData(QUERY_KEYS.TRANSACTIONS.BY_ID(data.id), data);
    },
  });
};

export const useApiDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useApiMutate<void, TransactionDeleteModel>({
    path: ENDPOINTS.TRANSACTIONS.BY_ID(":id"),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.INFINITE().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: BASE_QUERY_KEYS.INSIGHTS,
        exact: false,
      });
    },
  });
};
