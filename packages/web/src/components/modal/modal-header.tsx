import React from 'react';

import { cn } from '../../libs/utils';

export interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalHeader({ children, className }: ModalHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between p-6 border-b border-gray-200', className)}>{children}</div>
  );
}
