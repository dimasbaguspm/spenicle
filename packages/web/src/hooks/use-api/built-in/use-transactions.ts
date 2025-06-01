import { useQueryClient } from '@tanstack/react-query';

import type {
  Transaction,
  TransactionQueryParameters,
  Error,
  NewTransaction,
  UpdateTransaction,
  PagedTransactions,
} from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiInfinite, type UseApiInfiniteResult } from '../use-api-infinite';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

export const useApiTransactionsQuery = (
  params?: TransactionQueryParameters
): UseApiQueryResult<PagedTransactions, Error> => {
  return useApiQuery<PagedTransactions, TransactionQueryParameters, Error>({
    queryKey: QUERY_KEYS.TRANSACTIONS.list(params),
    path: '/transactions',
    queryParams: params,
  });
};

export const useApiTransactionsInfiniteQuery = (
  params?: Omit<TransactionQueryParameters, 'pageNumber'>
): UseApiInfiniteResult<PagedTransactions, Error> => {
  return useApiInfinite<PagedTransactions, TransactionQueryParameters, Error>({
    queryKey: QUERY_KEYS.TRANSACTIONS.infinite(params),
    path: '/transactions',
    queryParams: params,
    initialPageParam: 1,
  });
};

// Get single transaction
export const useApiTransactionQuery = (transactionId: number): UseApiQueryResult<Transaction, Error> => {
  return useApiQuery<Transaction, never, Error>({
    queryKey: QUERY_KEYS.TRANSACTIONS.single(transactionId),
    path: `/transactions/${transactionId}`,
    enabled: !!transactionId,
  });
};

export const useApiGetTransactionsMutation = (): UseApiMutateResult<
  PagedTransactions,
  TransactionQueryParameters,
  Error
> => {
  return useApiMutate<PagedTransactions, TransactionQueryParameters, Error>({
    path: '/transactions',
    method: 'GET',
  });
};

// Create transaction
export const useApiCreateTransactionMutation = (): UseApiMutateResult<Transaction, NewTransaction, Error> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: '/transactions',
    method: 'POST',
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS.all(), exact: false });
    },
  });
};

// Update transaction
export const useApiUpdateTransactionMutation = (): UseApiMutateResult<
  Transaction,
  UpdateTransaction & { transactionId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/transactions/:transactionId`,
    method: 'PATCH',
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS.all(), exact: false });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TRANSACTIONS.single(variables.transactionId),
        exact: false,
      });
    },
  });
};

// Delete transaction
export const useApiDeleteTransactionMutation = (): UseApiMutateResult<
  Transaction,
  { transactionId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/transactions/:transactionId`,
    method: 'DELETE',
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRANSACTIONS.all(), exact: false });
      queryClient.removeQueries({ queryKey: QUERY_KEYS.TRANSACTIONS.single(variables.transactionId), exact: false });
    },
  });
};
