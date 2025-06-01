import React from 'react';

import { cn } from '../../libs/utils';

export interface BreadcrumbSeparatorProps {
  children?: React.ReactNode;
  className?: string;
}

export function BreadcrumbSeparator({ children = '/', className }: BreadcrumbSeparatorProps) {
  return (
    <span className={cn('mx-2 text-mist-400 select-none', className)} aria-hidden="true">
      {children}
    </span>
  );
}
