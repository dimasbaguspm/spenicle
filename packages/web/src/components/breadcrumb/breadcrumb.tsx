import React from 'react';

import { cn } from '../../libs/utils';

import { BreadcrumbContext, type BreadcrumbContextValue } from './breadcrumb-context';

export interface BreadcrumbProps extends BreadcrumbContextValue {
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

const variantClasses = {
  mist: 'text-mist-600',
  slate: 'text-slate-600',
  sage: 'text-sage-600',
};

export function Breadcrumb({
  children,
  className,
  separator = '/',
  variant = 'mist',
  'aria-label': ariaLabel = 'Breadcrumb navigation',
}: BreadcrumbProps) {
  const contextValue: BreadcrumbContextValue = {
    separator,
    variant,
  };

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      <nav aria-label={ariaLabel} className={cn('flex items-center space-x-1', variantClasses[variant], className)}>
        <ol className="flex items-center space-x-1">{children}</ol>
      </nav>
    </BreadcrumbContext.Provider>
  );
}
