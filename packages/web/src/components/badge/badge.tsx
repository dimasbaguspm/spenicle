import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-coral-500 text-cream-100',
        secondary: 'bg-sage-500 text-cream-100',
        tertiary: 'bg-mist-500 text-white',
        outline: 'border border-slate-300 bg-transparent text-slate-600',
        ghost: 'bg-slate-100 text-slate-600',

        // Core color variants
        coral: 'bg-coral-500 text-cream-100',
        'coral-outline': 'border border-coral-300 bg-transparent text-coral-600',
        'coral-ghost': 'bg-coral-50 text-coral-600',
        sage: 'bg-sage-500 text-cream-100',
        'sage-outline': 'border border-sage-300 bg-transparent text-sage-600',
        'sage-ghost': 'bg-sage-50 text-sage-600',
        mist: 'bg-mist-500 text-white',
        'mist-outline': 'border border-mist-300 bg-transparent text-mist-600',
        'mist-ghost': 'bg-mist-50 text-mist-600',
        slate: 'bg-slate-100 text-slate-600',
        'slate-outline': 'border border-slate-300 bg-transparent text-slate-600',
        'slate-ghost': 'bg-slate-50 text-slate-600',

        // Semantic variants for log levels
        success: 'bg-success-500 text-white',
        'success-outline': 'border border-success-300 bg-transparent text-success-600',
        'success-ghost': 'bg-success-50 text-success-600',

        info: 'bg-info-500 text-white',
        'info-outline': 'border border-info-300 bg-transparent text-info-600',
        'info-ghost': 'bg-info-50 text-info-600',

        warning: 'bg-warning-500 text-white',
        'warning-outline': 'border border-warning-300 bg-transparent text-warning-600',
        'warning-ghost': 'bg-warning-50 text-warning-600',

        danger: 'bg-danger-500 text-white',
        'danger-outline': 'border border-danger-300 bg-transparent text-danger-600',
        'danger-ghost': 'bg-danger-50 text-danger-600',

        // Legacy error variants (kept for backward compatibility)
        error: 'bg-danger-500 text-white',
        'error-outline': 'border border-danger-300 bg-white text-danger-600',
        'error-ghost': 'bg-danger-50 text-danger-600',
      },
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-sm',
        xl: 'h-8 px-4 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, size, ...props }, ref) => {
  return <span className={cn(badgeVariants({ variant, size, className }))} ref={ref} {...props} />;
});

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
