import React, { useContext } from 'react';

import { cn } from '../../libs/utils';

import { AlertContext } from './alert-context';

export interface AlertIconProps {
  children: React.ReactNode;
  className?: string;
}

export function AlertIcon({ children, className }: AlertIconProps) {
  const context = useContext(AlertContext);

  // Get icon color based on alert variant
  const getIconColor = () => {
    if (!context?.variant) return 'text-mist-600';

    switch (context.variant) {
      case 'coral':
        return 'text-coral-600';
      case 'sage':
        return 'text-sage-600';
      case 'mist':
        return 'text-mist-600';
      case 'slate':
        return 'text-slate-600';
      case 'success':
        return 'text-success-600';
      case 'info':
        return 'text-info-600';
      case 'warning':
        return 'text-warning-600';
      case 'danger':
        return 'text-danger-600';
      default:
        return 'text-mist-600';
    }
  };

  return <div className={cn('flex-shrink-0 mt-0.5', getIconColor(), className)}>{children}</div>;
}
