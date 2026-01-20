import type {
  TransactionTemplateSearchModel,
  TransactionTemplateModel,
  TransactionTemplateCreateModel,
  TransactionTemplateUpdateModel,
  TransactionTemplateDeleteModel,
  TransactionTemplatePagedModel,
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

export const useApiTransactionTemplatesInfiniteQuery = (
  params: TransactionTemplateSearchModel,
  options?: Partial<
    UseApiInfiniteQueryOptions<
      TransactionTemplateModel,
      TransactionTemplateSearchModel,
      unknown
    >
  >,
) => {
  return useApiInfiniteQuery({
    ...options,
    queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.INFINITE(params),
    queryParams: params,
    path: ENDPOINTS.TRANSACTION_TEMPLATES.PAGINATED,
  });
};

export const useApiTransactionTemplatesPaginatedQuery = (
  params: TransactionTemplateSearchModel,
  options?: Partial<
    UseApiQueryOptions<
      TransactionTemplatePagedModel,
      TransactionTemplateSearchModel,
      unknown
    >
  >,
) => {
  return useApiQuery<
    TransactionTemplatePagedModel,
    TransactionTemplateSearchModel
  >({
    ...options,
    queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.PAGINATED(params),
    queryParams: params,
    path: ENDPOINTS.TRANSACTION_TEMPLATES.PAGINATED,
  });
};

export const useApiTransactionTemplateQuery = (
  id: number,
  options?: Partial<
    UseApiQueryOptions<TransactionTemplateModel, unknown, unknown>
  >,
) => {
  return useApiQuery<TransactionTemplateModel, unknown>({
    ...options,
    queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.BY_ID(id),
    path: ENDPOINTS.TRANSACTION_TEMPLATES.BY_ID(id),
  });
};

export const useApiCreateTransactionTemplate = () => {
  const queryClient = useQueryClient();
  return useApiMutate<TransactionTemplateModel, TransactionTemplateCreateModel>(
    {
      path: ENDPOINTS.TRANSACTION_TEMPLATES.PAGINATED,
      method: "POST",
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.PAGINATED().slice(0, 2),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.INFINITE().slice(0, 2),
          exact: false,
        });
        queryClient.setQueryData(
          QUERY_KEYS.TRANSACTION_TEMPLATES.BY_ID(data.id),
          data,
        );
      },
    },
  );
};

export const useApiUpdateTransactionTemplate = () => {
  const queryClient = useQueryClient();
  return useApiMutate<TransactionTemplateModel, TransactionTemplateUpdateModel>(
    {
      path: ENDPOINTS.TRANSACTION_TEMPLATES.BY_ID(":id"),
      method: "PATCH",
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.PAGINATED().slice(0, 2),
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.INFINITE().slice(0, 2),
          exact: false,
        });
        queryClient.setQueryData(
          QUERY_KEYS.TRANSACTION_TEMPLATES.BY_ID(data.id),
          data,
        );
      },
    },
  );
};

export const useApiDeleteTransactionTemplate = () => {
  const queryClient = useQueryClient();
  return useApiMutate<void, TransactionTemplateDeleteModel>({
    path: ENDPOINTS.TRANSACTION_TEMPLATES.BY_ID(":id"),
    method: "DELETE",
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTION_TEMPLATES.INFINITE().slice(0, 2),
        exact: false,
      });
    },
  });
};
