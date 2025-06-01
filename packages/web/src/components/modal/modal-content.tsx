import React from 'react';

import { cn } from '../../libs/utils';

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalContent({ children, className }: ModalContentProps) {
  return <div className={cn('flex-1 p-6 overflow-y-auto', className)}>{children}</div>;
}
