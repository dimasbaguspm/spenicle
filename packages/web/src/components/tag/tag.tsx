import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const tagVariants = cva(
  'inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-coral-100 text-coral-700 border border-coral-200',
        secondary: 'bg-sage-100 text-sage-700 border border-sage-200',
        tertiary: 'bg-mist-100 text-mist-700 border border-mist-200',
        outline: 'border border-slate-300 bg-transparent text-slate-600',
        ghost: 'text-slate-600 bg-slate-50',

        // Core color variants
        coral: 'bg-coral-100 text-coral-700 border border-coral-200',
        'coral-outline': 'border border-coral-300 bg-transparent text-coral-600',
        'coral-solid': 'bg-coral-500 text-cream-100 border border-coral-500',

        sage: 'bg-sage-100 text-sage-700 border border-sage-200',
        'sage-outline': 'border border-sage-300 bg-transparent text-sage-600',
        'sage-solid': 'bg-sage-500 text-cream-100 border border-sage-500',

        mist: 'bg-mist-100 text-mist-700 border border-mist-200',
        'mist-outline': 'border border-mist-300 bg-transparent text-mist-600',
        'mist-solid': 'bg-mist-500 text-white border border-mist-500',

        slate: 'bg-slate-100 text-slate-700 border border-slate-200',
        'slate-outline': 'border border-slate-300 bg-transparent text-slate-600',
        'slate-solid': 'bg-slate-500 text-white border border-slate-500',

        // Semantic variants for log levels
        success: 'bg-success-100 text-success-700 border border-success-200',
        'success-outline': 'border border-success-300 bg-transparent text-success-600',
        'success-solid': 'bg-success-500 text-white border border-success-500',

        info: 'bg-info-100 text-info-700 border border-info-200',
        'info-outline': 'border border-info-300 bg-transparent text-info-600',
        'info-solid': 'bg-info-500 text-white border border-info-500',

        warning: 'bg-warning-100 text-warning-700 border border-warning-200',
        'warning-outline': 'border border-warning-300 bg-transparent text-warning-600',
        'warning-solid': 'bg-warning-500 text-white border border-warning-500',

        danger: 'bg-danger-100 text-danger-700 border border-danger-200',
        'danger-outline': 'border border-danger-300 bg-transparent text-danger-600',
        'danger-solid': 'bg-danger-500 text-white border border-danger-500',

        // Legacy error variants (kept for backward compatibility)
        error: 'bg-danger-100 text-danger-700 border border-danger-200',
        'error-outline': 'border border-danger-300 bg-transparent text-danger-600',
        'error-solid': 'bg-danger-500 text-white border border-danger-500',
      },
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-3 text-sm',
        lg: 'h-8 px-4 text-base',
        xl: 'h-10 px-5 text-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {
  /**
   * Whether the tag should be removable (shows a close button)
   */
  removable?: boolean;
  /**
   * Callback when the tag is removed
   */
  onRemove?: () => void;
}

const Tag = forwardRef<HTMLSpanElement, TagProps>(
  ({ className, variant, size, children, removable, onRemove, ...props }, ref) => {
    return (
      <span className={cn(tagVariants({ variant, size, className }))} ref={ref} {...props}>
        {children}
        {removable && (
          <button
            type="button"
            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current"
            onClick={onRemove}
            aria-label="Remove tag"
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
      </span>
    );
  }
);

Tag.displayName = 'Tag';

export { Tag, tagVariants };
