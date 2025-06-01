import React, { createContext, useContext } from 'react';

export interface BreadcrumbContextValue {
  separator?: React.ReactNode;
  variant?: 'mist' | 'slate' | 'sage';
}

export const BreadcrumbContext = createContext<BreadcrumbContextValue | undefined>(undefined);

export function useBreadcrumbContext() {
  const context = useContext(BreadcrumbContext);
  if (!context) {
    throw new Error('Breadcrumb components must be used within a Breadcrumb');
  }
  return context;
}
