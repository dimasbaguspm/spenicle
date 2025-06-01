import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const kbdVariants = cva(
  'inline-flex items-center justify-center rounded border font-mono text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-slate-300 bg-slate-100 text-slate-700 shadow-sm',
        secondary: 'border-mist-300 bg-mist-50 text-mist-700 shadow-sm',
        outline: 'border-slate-300 bg-transparent text-slate-600',
        ghost: 'border-transparent bg-slate-50 text-slate-600',

        // Core color variants
        coral: 'border-coral-300 bg-coral-50 text-coral-700 shadow-sm',
        'coral-outline': 'border-coral-300 bg-transparent text-coral-600',
        'coral-ghost': 'border-transparent bg-coral-50 text-coral-600',
        sage: 'border-sage-300 bg-sage-50 text-sage-700 shadow-sm',
        'sage-outline': 'border-sage-300 bg-transparent text-sage-600',
        'sage-ghost': 'border-transparent bg-sage-50 text-sage-600',
        mist: 'border-mist-300 bg-mist-50 text-mist-700 shadow-sm',
        'mist-outline': 'border-mist-300 bg-transparent text-mist-600',
        'mist-ghost': 'border-transparent bg-mist-50 text-mist-600',
        slate: 'border-slate-300 bg-slate-100 text-slate-700 shadow-sm',
        'slate-outline': 'border-slate-300 bg-transparent text-slate-600',
        'slate-ghost': 'border-transparent bg-slate-50 text-slate-600',

        // Semantic variants for log levels
        success: 'border-success-300 bg-success-50 text-success-700 shadow-sm',
        'success-outline': 'border-success-300 bg-transparent text-success-600',
        'success-ghost': 'border-transparent bg-success-50 text-success-600',

        info: 'border-info-300 bg-info-50 text-info-700 shadow-sm',
        'info-outline': 'border-info-300 bg-transparent text-info-600',
        'info-ghost': 'border-transparent bg-info-50 text-info-600',

        warning: 'border-warning-300 bg-warning-50 text-warning-700 shadow-sm',
        'warning-outline': 'border-warning-300 bg-transparent text-warning-600',
        'warning-ghost': 'border-transparent bg-warning-50 text-warning-600',

        danger: 'border-danger-300 bg-danger-50 text-danger-700 shadow-sm',
        'danger-outline': 'border-danger-300 bg-transparent text-danger-600',
        'danger-ghost': 'border-transparent bg-danger-50 text-danger-600',

        // Legacy error variants (kept for backward compatibility)
        error: 'border-danger-300 bg-danger-50 text-danger-700 shadow-sm',
        'error-outline': 'border-danger-300 bg-transparent text-danger-600',
        'error-ghost': 'border-transparent bg-danger-50 text-danger-600',
      },
      size: {
        sm: 'h-5 px-1.5 text-xs min-w-[20px]',
        md: 'h-6 px-2 text-xs min-w-[24px]',
        lg: 'h-7 px-2.5 text-sm min-w-[28px]',
        xl: 'h-8 px-3 text-sm min-w-[32px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface KbdProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof kbdVariants> {}

const Kbd = forwardRef<HTMLElement, KbdProps>(({ className, variant, size, ...props }, ref) => {
  return <kbd className={cn(kbdVariants({ variant, size, className }))} ref={ref} {...props} />;
});

Kbd.displayName = 'Kbd';

export { Kbd, kbdVariants };
