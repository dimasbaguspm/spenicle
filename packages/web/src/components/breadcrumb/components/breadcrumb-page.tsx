import React from 'react';

import { breadcrumbPageVariants, combineClasses } from '../helpers';
import type { BreadcrumbPageProps } from '../types';

/**
 * breadcrumb page component for current page indication
 * styled to show current location in navigation hierarchy
 */
export const BreadcrumbPage: React.FC<BreadcrumbPageProps> = ({ children, className, variant = 'mist' }) => {
  return (
    <span className={combineClasses(breadcrumbPageVariants({ variant }), className)} aria-current="page">
      {children}
    </span>
  );
};
