import React from 'react';

import { cn } from '../../libs/utils';

export interface BreadcrumbPageProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'mist' | 'slate' | 'sage';
}

export function BreadcrumbPage({ children, className, variant = 'mist' }: BreadcrumbPageProps) {
  const variantClasses = {
    mist: 'text-mist-800 font-medium',
    slate: 'text-slate-800 font-medium',
    sage: 'text-sage-800 font-medium',
  };

  return (
    <span className={cn(variantClasses[variant], 'cursor-default', className)} aria-current="page">
      {children}
    </span>
  );
}
