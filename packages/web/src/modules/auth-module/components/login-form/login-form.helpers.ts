import { TokenManager } from '../../../../hooks/use-session/use-session';

import type { LoginFormValues } from './types';

export const DEFAULT_FORM_VALUES: LoginFormValues = {
  email: '',
  password: '',
};

export const VALIDATION_RULES = {
  email: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address',
    },
  },
  password: {
    required: 'Password is required',
    minLength: {
      value: 6,
      message: 'Password must be at least 6 characters',
    },
  },
};

/**
 * Handle storing authentication tokens
 * @deprecated Use TokenManager.setTokens instead
 */
export const handleTokenStorage = (accessToken: string) => {
  TokenManager.setTokens({ accessToken });
};
