import React from 'react';

import { cn } from '../../libs/utils';

export interface AlertTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertTitle({ children, className }: AlertTitleProps) {
  return <h3 className={cn('text-sm font-semibold leading-none tracking-tight', className)}>{children}</h3>;
}
