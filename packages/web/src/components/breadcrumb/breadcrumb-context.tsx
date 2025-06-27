import { createContext, useContext } from 'react';

import type { BreadcrumbContextValue } from './types';

export const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

/**
 * hook to access breadcrumb context values
 * throws error if used outside breadcrumb provider
 */
export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('Breadcrumb components must be used within a Breadcrumb');
  }
  return context;
}

export type { BreadcrumbContextValue };
