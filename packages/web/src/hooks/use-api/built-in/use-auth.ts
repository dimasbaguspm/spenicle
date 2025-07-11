import type { User, Error, RegistrationWithGroup, LoginRequest, RefreshTokenRequest } from '../../../types/api';
import { useApiMutate, type UseApiMutateResult } from '../use-api-mutate';

// Register user
export const useApiRegisterMutation = (): UseApiMutateResult<
  { refreshToken: string; user: User; token: string },
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

export const useApiRefreshTokenMutation = (): UseApiMutateResult<
  {
    token: string;
    refreshToken: string;
    user: User;
  },
  RefreshTokenRequest,
  Error
> => {
  return useApiMutate({
    path: '/auth/refresh-token',
    method: 'POST',
  });
};

// Login user
export const useApiLoginMutation = (): UseApiMutateResult<
  { refreshToken: string; user: User; token: string },
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
