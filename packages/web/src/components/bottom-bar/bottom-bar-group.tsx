import React from 'react';

import { cn } from '../../libs/utils';

export interface BottomBarGroupProps {
  children: React.ReactNode;
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
}

const spacingClasses = {
  tight: 'gap-1',
  normal: 'gap-2',
  loose: 'gap-4',
} as const;

export function BottomBarGroup({ children, className, spacing = 'normal' }: BottomBarGroupProps) {
  return <div className={cn('flex items-center', spacingClasses[spacing], className)}>{children}</div>;
}
