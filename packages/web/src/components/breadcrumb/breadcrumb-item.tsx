import React from 'react';

import { cn } from '../../libs/utils';

import { useBreadcrumbContext } from './breadcrumb-context';

export interface BreadcrumbItemProps {
  children: React.ReactNode;
  className?: string;
  isCurrentPage?: boolean;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function BreadcrumbItem({ children, className, isCurrentPage = false, href, onClick }: BreadcrumbItemProps) {
  const { separator, variant } = useBreadcrumbContext();

  const variantClasses = {
    mist: {
      link: 'text-mist-600 hover:text-mist-700 hover:underline transition-colors',
      current: 'text-mist-800 font-medium',
      separator: 'text-mist-400',
    },
    slate: {
      link: 'text-slate-600 hover:text-slate-700 hover:underline transition-colors',
      current: 'text-slate-800 font-medium',
      separator: 'text-slate-400',
    },
    sage: {
      link: 'text-sage-600 hover:text-sage-700 hover:underline transition-colors',
      current: 'text-sage-800 font-medium',
      separator: 'text-sage-400',
    },
  };

  const classes = variantClasses[variant ?? 'mist'];

  const content = isCurrentPage ? (
    <span className={cn(classes.current, 'cursor-default', className)} aria-current="page">
      {children}
    </span>
  ) : href ? (
    <a href={href} onClick={onClick} className={cn(classes.link, className)}>
      {children}
    </a>
  ) : (
    <button
      onClick={onClick as unknown as React.MouseEventHandler<HTMLButtonElement>}
      className={cn(classes.link, 'bg-transparent border-none p-0 cursor-pointer', className)}
    >
      {children}
    </button>
  );

  return (
    <li className="flex items-center">
      {content}
      {!isCurrentPage && (
        <span className={cn('mx-2 select-none', classes.separator)} aria-hidden="true">
          {separator}
        </span>
      )}
    </li>
  );
}
