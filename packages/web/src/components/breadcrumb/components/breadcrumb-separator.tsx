import React from 'react';

import { breadcrumbSeparatorVariants, combineClasses } from '../helpers';
import type { BreadcrumbSeparatorProps } from '../types';

/**
 * breadcrumb separator component for visual separation between items
 * supports custom content and styling variants
 */
export const BreadcrumbSeparator: React.FC<BreadcrumbSeparatorProps> = ({
  children = '/',
  className,
  variant = 'mist',
}) => {
  return (
    <span className={combineClasses(breadcrumbSeparatorVariants({ variant }), className)} aria-hidden="true">
      {children}
    </span>
  );
};
