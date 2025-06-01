import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const snackVariants = cva(
  'inline-flex items-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm',
  {
    variants: {
      variant: {
        default: 'bg-coral-50 text-coral-800 border border-coral-200',
        secondary: 'bg-sage-50 text-sage-800 border border-sage-200',
        tertiary: 'bg-mist-50 text-mist-800 border border-mist-200',
        outline: 'border border-slate-300 bg-white text-slate-700',
        ghost: 'text-slate-700 bg-slate-50',

        // Core color variants
        coral: 'bg-coral-50 text-coral-800 border border-coral-200',
        'coral-outline': 'border border-coral-300 bg-white text-coral-700',
        'coral-solid': 'bg-coral-500 text-white border border-coral-500',

        sage: 'bg-sage-50 text-sage-800 border border-sage-200',
        'sage-outline': 'border border-sage-300 bg-white text-sage-700',
        'sage-solid': 'bg-sage-500 text-white border border-sage-500',

        mist: 'bg-mist-50 text-mist-800 border border-mist-200',
        'mist-outline': 'border border-mist-300 bg-white text-mist-700',
        'mist-solid': 'bg-mist-500 text-white border border-mist-500',

        slate: 'bg-slate-50 text-slate-800 border border-slate-200',
        'slate-outline': 'border border-slate-300 bg-white text-slate-700',
        'slate-solid': 'bg-slate-500 text-white border border-slate-500',

        // Semantic variants for notifications
        success: 'bg-success-50 text-success-800 border border-success-200',
        'success-outline': 'border border-success-300 bg-white text-success-700',
        'success-solid': 'bg-success-500 text-white border border-success-500',

        info: 'bg-info-50 text-info-800 border border-info-200',
        'info-outline': 'border border-info-300 bg-white text-info-700',
        'info-solid': 'bg-info-500 text-white border border-info-500',

        warning: 'bg-warning-50 text-warning-800 border border-warning-200',
        'warning-outline': 'border border-warning-300 bg-white text-warning-700',
        'warning-solid': 'bg-warning-500 text-white border border-warning-500',

        danger: 'bg-danger-50 text-danger-800 border border-danger-200',
        'danger-outline': 'border border-danger-300 bg-white text-danger-700',
        'danger-solid': 'bg-danger-500 text-white border border-danger-500',

        // Legacy error variants (kept for backward compatibility)
        error: 'bg-danger-50 text-danger-800 border border-danger-200',
        'error-outline': 'border border-danger-300 bg-white text-danger-700',
        'error-solid': 'bg-danger-500 text-white border border-danger-500',
      },
      size: {
        sm: 'px-3 py-2 text-sm min-h-8',
        md: 'px-4 py-3 text-sm min-h-10',
        lg: 'px-5 py-4 text-base min-h-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface SnackProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof snackVariants> {
  /**
   * Whether the snack should show a close button
   */
  onClose?: () => void;
  /**
   * Icon to display in the snack
   */
  icon?: React.ReactNode;
  /**
   * Action element (like a button) to display on the right
   */
  action?: React.ReactNode;
}

const Snack = forwardRef<HTMLDivElement, SnackProps>(
  ({ className, variant, size, children, onClose, icon, action, ...props }, ref) => {
    return (
      <div className={cn(snackVariants({ variant, size, className }))} ref={ref} {...props}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">{children}</div>
        {action && <span className="flex-shrink-0">{action}</span>}
        {onClose && (
          <button
            type="button"
            className="flex-shrink-0 ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current transition-colors"
            onClick={onClose}
            aria-label="Close notification"
          >
            <svg
              className="h-3 w-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Snack.displayName = 'Snack';

export { Snack, snackVariants };
