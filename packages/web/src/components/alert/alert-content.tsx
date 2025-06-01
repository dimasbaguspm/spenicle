import React from 'react';

import { cn } from '../../libs/utils';

export interface AlertContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertContent({ children, className }: AlertContentProps) {
  return <div className={cn('flex-1 space-y-1', className)}>{children}</div>;
}
