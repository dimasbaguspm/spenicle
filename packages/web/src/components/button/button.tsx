import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '../../libs/utils';
import { Loader } from '../loader';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-coral-500 text-cream-100 hover:bg-coral-600 focus:ring-coral-300',
        secondary: 'bg-sage-500 text-cream-100 hover:bg-sage-600 focus:ring-sage-300',
        tertiary: 'bg-mist-500 text-white hover:bg-mist-600 focus:ring-mist-300',
        outline: 'border border-slate-300 bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-400',
        ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',

        // Core color variants
        coral: 'bg-coral-500 text-cream-100 hover:bg-coral-600 focus:ring-coral-300',
        'coral-outline': 'border border-coral-300 bg-transparent text-coral-600 hover:bg-coral-50 focus:ring-coral-400',
        sage: 'bg-sage-500 text-cream-100 hover:bg-sage-600 focus:ring-sage-300',
        'sage-outline': 'border border-sage-300 bg-transparent text-sage-600 hover:bg-sage-50 focus:ring-sage-400',
        mist: 'bg-mist-500 text-white hover:bg-mist-600 focus:ring-mist-300',
        'mist-outline': 'border border-mist-300 bg-transparent text-mist-600 hover:bg-mist-50 focus:ring-mist-400',
        slate: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
        'slate-outline': 'border border-slate-300 bg-transparent text-slate-600 hover:bg-slate-50 focus:ring-slate-400',

        // Semantic variants for log levels
        success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-300',
        'success-outline':
          'border border-success-300 bg-transparent text-success-600 hover:bg-success-50 focus:ring-success-400',
        'success-ghost': 'text-success-600 hover:bg-success-50 focus:ring-success-300',

        info: 'bg-info-500 text-white hover:bg-info-600 focus:ring-info-300',
        'info-outline': 'border border-info-300 bg-transparent text-info-600 hover:bg-info-50 focus:ring-info-400',
        'info-ghost': 'text-info-600 hover:bg-info-50 focus:ring-info-300',

        warning: 'bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-300',
        'warning-outline':
          'border border-warning-300 bg-transparent text-warning-600 hover:bg-warning-50 focus:ring-warning-400',
        'warning-ghost': 'text-warning-600 hover:bg-warning-50 focus:ring-warning-300',

        danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-300',
        'danger-outline':
          'border border-danger-300 bg-transparent text-danger-600 hover:bg-danger-50 focus:ring-danger-400',
        'danger-ghost': 'text-danger-600 hover:bg-danger-50 focus:ring-danger-300',

        // Legacy error variants (kept for backward compatibility)
        error: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-300',
        'error-outline': 'border border-danger-300 bg-white text-danger-600 hover:bg-danger-50 focus:ring-danger-400',
        'error-ghost': 'text-danger-600 hover:bg-danger-50 focus:ring-danger-300',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        xl: 'h-14 px-8 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** When true, shows a loader and disables the button */
  busy?: boolean;
  /** Icon to display on the left side of the button */
  iconLeft?: ReactNode;
  /** Icon to display on the right side of the button */
  iconRight?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, busy, iconLeft, iconRight, children, disabled, ...props }, ref) => {
    const isDisabled = disabled ?? busy;

    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={isDisabled} {...props}>
        {busy ? (
          <>
            <Loader
              size="sm"
              variant={variant === 'outline' || variant?.includes('outline') ? 'default' : 'cream'}
              className="mr-2"
            />
            {children}
          </>
        ) : (
          <>
            {iconLeft && <span className="mr-2">{iconLeft}</span>}
            {children}
            {iconRight && <span className="ml-2">{iconRight}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
