import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const loaderVariants = cva(
  'inline-flex items-center justify-center animate-spin rounded-full border-2 border-solid border-current border-r-transparent',
  {
    variants: {
      variant: {
        default: 'text-coral-500',
        secondary: 'text-sage-500',
        tertiary: 'text-mist-500',
        ghost: 'text-slate-600',

        // Core color variants
        coral: 'text-coral-500',
        sage: 'text-sage-500',
        mist: 'text-mist-500',
        slate: 'text-slate-600',
        cream: 'text-cream-600',

        // Semantic variants for log levels
        success: 'text-success-500',
        info: 'text-info-500',
        warning: 'text-warning-500',
        danger: 'text-danger-500',

        // Legacy error variant (kept for backward compatibility)
        error: 'text-danger-500',
      },
      size: {
        xs: 'h-3 w-3 border',
        sm: 'h-4 w-4 border',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2',
        xl: 'h-10 w-10 border-[3px]',
        '2xl': 'h-12 w-12 border-[3px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof loaderVariants> {
  /** Additional text to display alongside the loader */
  text?: string;
  /** Position of the text relative to the loader */
  textPosition?: 'right' | 'bottom';
}

const Loader = forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, variant, size, text, textPosition = 'right', ...props }, ref) => {
    const loader = <div className={cn(loaderVariants({ variant, size }))} aria-label="Loading..." />;

    if (!text) {
      return (
        <div className={cn('inline-flex', className)} ref={ref} {...props}>
          {loader}
        </div>
      );
    }

    const textElement = (
      <span className={cn('text-sm font-medium', variant === 'ghost' ? 'text-slate-600' : 'text-slate-700')}>
        {text}
      </span>
    );

    if (textPosition === 'bottom') {
      return (
        <div className={cn('inline-flex flex-col items-center gap-2', className)} ref={ref} {...props}>
          {loader}
          {textElement}
        </div>
      );
    }

    return (
      <div className={cn('inline-flex items-center gap-2', className)} ref={ref} {...props}>
        {loader}
        {textElement}
      </div>
    );
  }
);

Loader.displayName = 'Loader';

export { Loader, loaderVariants };
