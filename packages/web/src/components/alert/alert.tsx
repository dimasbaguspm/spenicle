import { cva, type VariantProps } from 'class-variance-authority';
import React, { forwardRef } from 'react';

import { cn } from '../../libs/utils';

import { AlertContext } from './alert-context';

const alertVariants = cva('relative w-full rounded-lg border p-4 flex items-start gap-3', {
  variants: {
    variant: {
      // Core color variants
      coral: 'border-coral-200 bg-coral-50 text-coral-900',
      sage: 'border-sage-200 bg-sage-50 text-sage-900',
      mist: 'border-mist-200 bg-mist-50 text-mist-900',
      slate: 'border-slate-200 bg-slate-50 text-slate-900',

      // Semantic variants
      success: 'border-success-200 bg-success-50 text-success-900',
      info: 'border-info-200 bg-info-50 text-info-900',
      warning: 'border-warning-200 bg-warning-50 text-warning-900',
      danger: 'border-danger-200 bg-danger-50 text-danger-900',

      // Outline variants
      'coral-outline': 'border-coral-300 bg-transparent text-coral-700',
      'sage-outline': 'border-sage-300 bg-transparent text-sage-700',
      'mist-outline': 'border-mist-300 bg-transparent text-mist-700',
      'slate-outline': 'border-slate-300 bg-transparent text-slate-700',
      'success-outline': 'border-success-300 bg-transparent text-success-700',
      'info-outline': 'border-info-300 bg-transparent text-info-700',
      'warning-outline': 'border-warning-300 bg-transparent text-warning-700',
      'danger-outline': 'border-danger-300 bg-transparent text-danger-700',
    },
    size: {
      sm: 'text-sm p-3',
      md: 'text-sm p-4',
      lg: 'text-base p-5',
    },
  },
  defaultVariants: {
    variant: 'mist',
    size: 'md',
  },
});

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  onClose?: () => void;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, size, onClose, children, ...props }, ref) => {
    return (
      <AlertContext.Provider value={{ onClose, variant }}>
        <div ref={ref} role="alert" className={cn(alertVariants({ variant, size }), className)} {...props}>
          {children}
        </div>
      </AlertContext.Provider>
    );
  }
);

Alert.displayName = 'Alert';

export { Alert, alertVariants };
