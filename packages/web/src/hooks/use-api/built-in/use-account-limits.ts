import { useQueryClient } from '@tanstack/react-query';

import type {
  AccountLimit,
  AccountLimitQueryParameters,
  PaginatedResponse,
  Error,
  NewAccountLimit,
  UpdateAccountLimit,
  PagedAccountLimits,
} from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiInfinite, type UseApiInfiniteResult } from '../use-api-infinite';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

export const useApiListAccountLimitsQuery = (
  accountId: number,
  params?: Omit<AccountLimitQueryParameters, 'accountId'>
): UseApiQueryResult<PaginatedResponse, Error> => {
  return useApiQuery<PaginatedResponse, AccountLimitQueryParameters, Error>({
    queryKey: QUERY_KEYS.ACCOUNT_LIMITS.list(accountId, params),
    path: `/accounts/${accountId}/limits`,
    queryParams: params,
    enabled: !!accountId,
  });
};

export const useApiInfiniteAccountLimitsQuery = (
  accountId: number,
  params?: Omit<AccountLimitQueryParameters, 'accountId'>
): UseApiInfiniteResult<PagedAccountLimits, Error> => {
  return useApiInfinite<PagedAccountLimits, AccountLimitQueryParameters, Error>({
    queryKey: QUERY_KEYS.ACCOUNT_LIMITS.infinite(accountId, params),
    path: `/accounts/${accountId}/limits`,
    queryParams: params,
    initialPageParam: 1,
  });
};

export const useApiSingleAccountLimitQuery = (
  accountId: number,
  limitId: number
): UseApiQueryResult<AccountLimit, Error> => {
  return useApiQuery<AccountLimit, never, Error>({
    queryKey: QUERY_KEYS.ACCOUNT_LIMITS.single(accountId, limitId),
    path: `/accounts/${accountId}/limits/${limitId}`,
    enabled: !!accountId && !!limitId,
  });
};

export const useApiCreateSingleAccountLimitMutation = (): UseApiMutateResult<
  AccountLimit,
  NewAccountLimit & { accountId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: '/accounts/:accountId/limits',
    method: 'POST',
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNT_LIMITS.all(), exact: false });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_LIMITS.list(variables.accountId),
        exact: false,
      });
    },
  });
};

export const useApiUpdateSingleAccountLimitMutation = (): UseApiMutateResult<
  AccountLimit,
  UpdateAccountLimit & { accountId: number; accountLimitId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/accounts/:accountId/limits/:accountLimitId`,
    method: 'PATCH',
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNT_LIMITS.all(), exact: false });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_LIMITS.list(variables.accountId),
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_LIMITS.single(variables.accountId, variables.accountLimitId),
        exact: false,
      });
    },
  });
};

export const useApiDeleteSingleAccountLimitMutation = (): UseApiMutateResult<
  AccountLimit,
  { accountId: number; accountLimitId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/accounts/:accountId/limits/:accountLimitId`,
    method: 'DELETE',
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNT_LIMITS.all(), exact: false });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNT_LIMITS.list(variables.accountId),
        exact: false,
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.ACCOUNT_LIMITS.single(variables.accountId, variables.accountLimitId),
        exact: false,
      });
    },
  });
};
