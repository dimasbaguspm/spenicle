import React from 'react';

import { cn } from '../../libs/utils';

export interface DrawerContentProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerContent({ children, className }: DrawerContentProps) {
  return <div className={cn('flex-1 overflow-auto p-4', className)}>{children}</div>;
}
