import React from 'react';

import { useBreadcrumbContext } from '../breadcrumb-context';
import {
  breadcrumbLinkVariants,
  breadcrumbPageVariants,
  breadcrumbSeparatorVariants,
  combineClasses,
} from '../helpers';
import type { BreadcrumbItemProps } from '../types';

/**
 * breadcrumb item component that renders as link, button, or current page
 * automatically handles separators and context-aware styling
 */
export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  children,
  className,
  isCurrentPage = false,
  href,
  onClick,
}) => {
  const { separator, variant = 'mist' } = useBreadcrumbContext();

  const content = isCurrentPage ? (
    <span className={combineClasses(breadcrumbPageVariants({ variant }), className)} aria-current="page">
      {children}
    </span>
  ) : href ? (
    <a
      href={href}
      onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
      className={combineClasses(breadcrumbLinkVariants({ variant }), className)}
    >
      {children}
    </a>
  ) : (
    <button
      type="button"
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      className={combineClasses(
        breadcrumbLinkVariants({ variant }),
        'bg-transparent border-none p-0 cursor-pointer',
        className
      )}
    >
      {children}
    </button>
  );

  return (
    <li className="flex items-center">
      {content}
      {!isCurrentPage && (
        <span className={combineClasses(breadcrumbSeparatorVariants({ variant }), 'mx-2')} aria-hidden="true">
          {separator}
        </span>
      )}
    </li>
  );
};
