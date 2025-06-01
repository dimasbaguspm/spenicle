import React from 'react';

import { cn } from '../../libs/utils';

export interface DrawerHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerHeader({ children, className }: DrawerHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between p-4 border-b border-gray-200', className)}>{children}</div>
  );
}
