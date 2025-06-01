import React from 'react';

import { cn } from '../../libs/utils';

export interface BreadcrumbLinkProps {
  children: React.ReactNode;
  href?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void;
  className?: string;
  variant?: 'mist' | 'slate' | 'sage';
}

export function BreadcrumbLink({ children, href, onClick, className, variant = 'mist' }: BreadcrumbLinkProps) {
  const variantClasses = {
    mist: 'text-mist-600 hover:text-mist-700 hover:underline transition-colors',
    slate: 'text-slate-600 hover:text-slate-700 hover:underline transition-colors',
    sage: 'text-sage-600 hover:text-sage-700 hover:underline transition-colors',
  };

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        className={cn(variantClasses[variant], className)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      className={cn(variantClasses[variant], 'bg-transparent border-none p-0 cursor-pointer', className)}
    >
      {children}
    </button>
  );
}
