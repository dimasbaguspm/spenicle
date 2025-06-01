import React from 'react';

import { cn } from '../../libs/utils';

export interface BottomBarActionProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

const variantClasses = {
  default: 'flex items-center justify-center',
  primary: 'flex items-center justify-center bg-coral-500/10 rounded-xl px-3 py-2',
  secondary: 'flex items-center justify-center bg-sage-500/10 rounded-xl px-3 py-2',
} as const;

export function BottomBarAction({ children, className, variant = 'default' }: BottomBarActionProps) {
  return <div className={cn(variantClasses[variant], className)}>{children}</div>;
}
