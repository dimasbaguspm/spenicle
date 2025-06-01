import React from 'react';

import { cn } from '../../libs/utils';

export interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalTitle({ children, className }: ModalTitleProps) {
  return <h2 className={cn('text-xl font-semibold text-gray-900', className)}>{children}</h2>;
}
