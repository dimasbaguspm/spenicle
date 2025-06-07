import type { User, Error, RegistrationWithGroup, LoginRequest } from '../../../types/api';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';

// Register user
export const useApiRegisterMutation = (): UseApiMutateResult<
  { message: string; user: User; token: string },
  RegistrationWithGroup,
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
  LoginRequest,
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
