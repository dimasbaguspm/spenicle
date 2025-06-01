import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo } from 'react';

import { useSnack } from '../../providers/snack';
import type { User } from '../../types/api';
import { useApiCurrentUserQuery } from '../use-api/built-in';

/**
 * Authentication states for the session
 */
export type AuthState = 'authenticated' | 'unauthenticated' | 'loading' | 'error';

/**
 * Session hook return type
 */
export interface UseSessionReturn {
  /** Current authenticated user data */
  user: User | undefined;
  /** Current authentication state */
  authState: AuthState;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Whether authentication is still loading */
  isLoading: boolean;
  /** Whether there's an authentication error */
  isError: boolean;
  /** Function to logout the user */
  logout: () => Promise<void>;
  /** Function to refresh user data */
  refreshUser: () => Promise<void>;
}

/**
 * Token management utilities
 */
const TokenManager = {
  getAccessToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem('refreshToken');
  },

  setTokens: (tokens: { accessToken?: string; refreshToken?: string }) => {
    if (tokens.accessToken) {
      localStorage.setItem('accessToken', tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  },

  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  hasTokens: (): boolean => {
    return Boolean(TokenManager.getAccessToken() ?? TokenManager.getRefreshToken());
  },
};

/**
 * Custom hook for managing user session and authentication state
 *
 * This hook provides:
 * - Current user data
 * - Authentication state management
 * - Logout functionality
 * - Token management
 * - Auto-redirect on authentication changes
 *
 * @returns {UseSessionReturn} Session state and actions
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { user, authState, isAuthenticated, logout } = useSession();
 *
 *   if (authState === 'loading') {
 *     return <div>Loading...</div>;
 *   }
 *
 *   if (!isAuthenticated) {
 *     return <div>Please log in</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Welcome, {user?.name}</h1>
 *       <button onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useSession = (): UseSessionReturn => {
  const navigate = useNavigate();
  const { success } = useSnack();

  // Check if tokens exist to determine if we should attempt to fetch user data
  const hasTokens = TokenManager.hasTokens();

  // Fetch current user data
  const [userData, userError, userState, refetchUser] = useApiCurrentUserQuery();

  // Extract user from the API response
  const user = userData;

  /**
   * Determine authentication state based on tokens and API response
   */
  const authState: AuthState = useMemo(() => {
    if (!hasTokens) {
      return 'unauthenticated';
    }

    if (userState.isLoading || userState.isPending) {
      return 'loading';
    }

    if (userState.isError || userError) {
      return 'error';
    }

    if (userState.isSuccess && user) {
      return 'authenticated';
    }

    return 'unauthenticated';
  }, [hasTokens, userState, userError, user]);

  /**
   * Derived authentication state helpers
   */
  const isAuthenticated = authState === 'authenticated';
  const isLoading = authState === 'loading';
  const isError = authState === 'error';

  /**
   * Logout function that clears tokens and redirects to login
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Clear tokens from localStorage
      TokenManager.clearTokens();

      // Show success message
      success('You have been logged out successfully.');

      // Redirect to login page
      await navigate({
        to: '/login',
        replace: true,
      });
    } catch {
      // Still clear tokens and redirect even if navigation fails
      TokenManager.clearTokens();
      await navigate({
        to: '/login',
        replace: true,
      });
    }
  }, [navigate, success]);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (hasTokens) {
      await refetchUser();
    }
  }, [hasTokens, refetchUser]);

  /**
   * Auto-logout when tokens are invalid or user fetch fails with auth error
   */
  useEffect(() => {
    if (hasTokens && userError && userState.isError) {
      // Check if error is authentication related (401, 403)
      const isAuthError = 'status' in userError && (userError.status === 401 || userError.status === 403);

      if (isAuthError) {
        // Auto-logout on authentication errors
        logout().catch(() => {});
      }
    }
  }, [hasTokens, userError, userState.isError, logout]);

  return {
    user,
    authState,
    isAuthenticated,
    isLoading,
    isError,
    logout,
    refreshUser,
  };
};

// Export token manager for use in other parts of the application
export { TokenManager };
