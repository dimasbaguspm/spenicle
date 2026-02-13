import type {
  TransactionSearchModel,
  TransactionsPagedModel,
  TransactionModel,
  TransactionCreateModel,
  TransactionUpdateModel,
  TransactionDeleteModel,
  BulkTransactionDraftModel,
  BulkTransactionDraftGetModel,
  BulkTransactionDraftResponseModel,
  BulkTransactionCommitResponseModel,
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

/**
 * Save bulk transaction updates as draft to Redis
 * Auto-save mechanism - call this every 5s after user stops editing
 */
export const useApiSaveBulkDraft = () => {
  const queryClient = useQueryClient();

  return useApiMutate<
    BulkTransactionDraftResponseModel,
    BulkTransactionDraftModel
  >({
    path: ENDPOINTS.TRANSACTIONS.BULK_DRAFT,
    method: "PATCH",
    onSuccess: (data) => {
      // Update the draft query with the response metadata
      queryClient.setQueryData(QUERY_KEYS.TRANSACTIONS.BULK_DRAFT(), data);
    },
  });
};

/**
 * Retrieve saved draft from Redis
 * Call on page load to restore unsaved edits
 */
export const useApiGetBulkDraft = () => {
  return useApiQuery<BulkTransactionDraftGetModel, never>({
    path: ENDPOINTS.TRANSACTIONS.BULK_DRAFT,
    queryKey: QUERY_KEYS.TRANSACTIONS.BULK_DRAFT(),
    // Don't retry on 404 - it just means no draft exists
    retry: false,
    // Don't show error toast on 404
    silentError: true,
  });
};

/**
 * Commit all draft changes atomically to database
 * All-or-nothing: either all transactions update or none do
 */
export const useApiCommitBulkDraft = () => {
  const queryClient = useQueryClient();

  return useApiMutate<BulkTransactionCommitResponseModel, void>({
    path: ENDPOINTS.TRANSACTIONS.BULK_DRAFT_COMMIT,
    method: "POST",
    onSuccess: () => {
      // Invalidate all transaction queries (they've been updated)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.PAGINATED().slice(0, 2),
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.INFINITE().slice(0, 2),
        exact: false,
      });
      // Invalidate individual transaction queries (they may have changed)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.BY_ID(0).slice(0, 2), // Match all BY_ID queries
        exact: false,
      });
      // Invalidate insights (balances and summaries affected)
      queryClient.invalidateQueries({
        queryKey: BASE_QUERY_KEYS.INSIGHTS,
        exact: false,
      });
      // Invalidate account queries (balances changed)
      queryClient.invalidateQueries({
        queryKey: BASE_QUERY_KEYS.ACCOUNTS,
        exact: false,
      });
      // Remove draft from cache (it's been committed)
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.BULK_DRAFT(),
      });
    },
  });
};

/**
 * Delete draft without committing changes
 * Discards all pending edits
 */
export const useApiDeleteBulkDraft = () => {
  const queryClient = useQueryClient();

  return useApiMutate<void, void>({
    path: ENDPOINTS.TRANSACTIONS.BULK_DRAFT,
    method: "DELETE",
    onSuccess: () => {
      // Remove draft from cache
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.BULK_DRAFT(),
      });
    },
  });
};
