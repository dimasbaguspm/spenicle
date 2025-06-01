import { useQueryClient } from '@tanstack/react-query';

import type { Group, User, Error, NewGroup, UpdateGroup } from '../../../types/api';
import { QUERY_KEYS } from '../constants';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';
import { useApiQuery, type UseApiQueryResult } from '../use-api-query';

// Get group details
export const useApiGroupQuery = (groupId: string): UseApiQueryResult<{ group: Group }, Error> => {
  return useApiQuery<{ group: Group }, never, Error>({
    queryKey: QUERY_KEYS.GROUPS.single(groupId),
    path: `/groups/${groupId}`,
    enabled: !!groupId,
  });
};

// Create group
export const useApiCreateGroupMutation = (): UseApiMutateResult<{ message: string; group: Group }, NewGroup, Error> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: '/groups',
    method: 'POST',
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.all(), exact: false });
    },
  });
};

// Update group
export const useApiUpdateGroupMutation = (): UseApiMutateResult<
  { message: string; group: Group },
  UpdateGroup & { groupId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/groups/:groupId`,
    method: 'PATCH',
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.all(), exact: false });
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.single(variables.groupId), exact: false });
    },
  });
};

// Get group users
export const useApiGroupUsersQuery = (groupId: string): UseApiQueryResult<{ users: User[] }, Error> => {
  return useApiQuery<{ users: User[] }, never, Error>({
    queryKey: QUERY_KEYS.GROUPS.users(groupId),
    path: `/groups/${groupId}/users`,
    enabled: !!groupId,
  });
};

// Invite user to group
export const useApiInviteUserToGroupMutation = (): UseApiMutateResult<
  { message: string },
  { email: string; groupId: number },
  Error
> => {
  const queryClient = useQueryClient();

  return useApiMutate({
    path: `/groups/:groupId/users`,
    method: 'POST',
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS.users(variables.groupId), exact: false });
    },
  });
};
