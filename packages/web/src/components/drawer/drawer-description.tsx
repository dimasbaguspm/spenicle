import React from 'react';

import { cn } from '../../libs/utils';

export interface DrawerDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerDescription({ children, className }: DrawerDescriptionProps) {
  return <p className={cn('text-sm text-gray-600 mt-1', className)}>{children}</p>;
}
