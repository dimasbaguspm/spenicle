import { useQueryClient } from '@tanstack/react-query';

import type { User, Error, UpdateUser } from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

// Get current user profile
export const useApiCurrentUserQuery = (): UseApiQueryResult<User, Error> => {
  return useApiQuery<User, never>({
    queryKey: QUERY_KEYS.USERS.current(),
    path: '/users/me',
  });
};

// Update current user profile
export const useApiUpdateCurrentUserMutation = (): UseApiMutateResult<User, UpdateUser, Error> => {
  const queryClient = useQueryClient();

  return useApiMutate<User, UpdateUser>({
    path: '/users/me',
    method: 'PATCH',
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS.current(), exact: false });
    },
  });
};
