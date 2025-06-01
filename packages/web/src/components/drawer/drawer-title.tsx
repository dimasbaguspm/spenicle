import React from 'react';

import { cn } from '../../libs/utils';

export interface DrawerTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerTitle({ children, className }: DrawerTitleProps) {
  return <h2 className={cn('text-lg font-semibold text-gray-900', className)}>{children}</h2>;
}
