import React from 'react';

import { cn } from '../../libs/utils';

export interface DrawerFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return <div className={cn('p-4 border-t border-gray-200 bg-gray-50', className)}>{children}</div>;
}
