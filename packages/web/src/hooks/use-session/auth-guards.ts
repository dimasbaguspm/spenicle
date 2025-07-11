import { redirect } from '@tanstack/react-router';

import { TokenManager } from './use-session';

/**
 * Helper function to protect routes that require authentication
 * This function should be used in the beforeLoad function of protected routes
 *
 * @param redirectTo - The path to redirect to if user is not authenticated (default: '/auth/login')
 * @returns A redirect object if user is not authenticated, otherwise undefined
 */
export const requireAuth = (redirectTo: string = '/auth/login') => {
  // Check if user has authentication tokens
  if (!TokenManager.hasTokens()) {
    throw redirect({
      to: redirectTo,
      replace: true,
    });
  }

  // User is authenticated, continue with route loading
  return undefined;
};

/**
 * Helper function to redirect authenticated users away from auth pages
 * This function should be used in the beforeLoad function of auth routes (login, register, etc.)
 * ```
 */
export const redirectIfAuthenticated = (redirectTo: string = '/') => {
  // Check if user has authentication tokens
  if (TokenManager.hasTokens()) {
    throw redirect({
      to: redirectTo,
      replace: true,
    });
  }

  // User is not authenticated, continue with route loading
  return undefined;
};
