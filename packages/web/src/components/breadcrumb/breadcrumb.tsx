import React from 'react';

import { BreadcrumbContext } from './breadcrumb-context';
import { breadcrumbVariants, combineClasses } from './helpers';
import type { BreadcrumbProps, BreadcrumbContextValue } from './types';

/**
 * breadcrumb navigation component with context provider
 * supports different visual variants and custom separators
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  children,
  className,
  separator = '/',
  variant = 'mist',
  'aria-label': ariaLabel = 'Breadcrumb navigation',
}) => {
  const contextValue: BreadcrumbContextValue = {
    separator,
    variant,
  };

  return (
    <BreadcrumbContext.Provider value={contextValue}>
      <nav aria-label={ariaLabel} className={combineClasses(breadcrumbVariants({ variant }), className)}>
        <ol className="flex items-center space-x-1">{children}</ol>
      </nav>
    </BreadcrumbContext.Provider>
  );
};
