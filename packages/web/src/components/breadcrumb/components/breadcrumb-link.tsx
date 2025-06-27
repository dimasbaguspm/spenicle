import React from 'react';

import { breadcrumbLinkVariants, combineClasses } from '../helpers';
import type { BreadcrumbLinkProps } from '../types';

/**
 * breadcrumb link component for navigational links
 * renders as anchor or button based on href prop
 */
export const BreadcrumbLink: React.FC<BreadcrumbLinkProps> = ({
  children,
  href,
  onClick,
  className,
  variant = 'mist',
}) => {
  if (href) {
    return (
      <a
        href={href}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        className={combineClasses(breadcrumbLinkVariants({ variant }), className)}
      >
        {children}
      </a>
    );
  }

  return (
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
};
