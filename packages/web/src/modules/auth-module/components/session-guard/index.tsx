import type { ReactNode } from 'react';

import { useSession } from '../../../../hooks';

export interface SessionGuardProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  unauthenticatedComponent?: ReactNode;
}

/**
 * SessionGuard component acts as middleware to ensure user session is loaded
 * before rendering protected content. It handles loading, error, and authentication states.
 *
 * @param children - The content to render when session is authenticated
 * @param loadingComponent - Optional custom loading component
 * @param errorComponent - Optional custom error component
 * @param unauthenticatedComponent - Optional custom unauthenticated component
 */
export function SessionGuard({
  children,
  loadingComponent,
  errorComponent,
  unauthenticatedComponent,
}: SessionGuardProps) {
  const { authState, isLoading, isError, logout } = useSession();

  if (isLoading) {
    return (
      loadingComponent ?? (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your session...</p>
          </div>
        </div>
      )
    );
  }

  if (isError || authState === 'error') {
    return (
      errorComponent ?? (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">Failed to load session. Please try refreshing the page.</p>
            <button onClick={logout} className="px-4 py-2 bg-coral-600 text-white rounded-md hover:bg-coral-700">
              Refresh Page
            </button>
          </div>
        </div>
      )
    );
  }

  if (authState !== 'authenticated') {
    return (
      unauthenticatedComponent ?? (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-600">Redirecting to login...</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
