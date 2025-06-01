import type { User, Error } from '../../../types/api';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';

// Register user
export const useApiRegisterMutation = (): UseApiMutateResult<
  { message: string; user: User; token: string },
  {
    user: {
      name: string;
      email: string;
      password: string;
    };
    group: {
      name: string;
      defaultCurrency?: string;
    };
  },
  Error
> => {
  return useApiMutate({
    path: '/auth/register',
    method: 'POST',
    headers: {
      Authorization: '',
    },
  });
};

// Login user
export const useApiLoginMutation = (): UseApiMutateResult<
  { message: string; user: User; token: string },
  {
    email: string;
    password: string;
  },
  Error
> => {
  return useApiMutate({
    path: '/auth/login',
    method: 'POST',
    headers: {
      Authorization: '',
    },
  });
};
