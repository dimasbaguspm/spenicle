import React from 'react';

import { cn } from '../../libs/utils';

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 p-6 border-t border-gray-200', className)}>{children}</div>
  );
}
