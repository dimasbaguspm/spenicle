import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const chipInputVariants = cva(
  'inline-flex items-center justify-center rounded-full font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-mist-100 text-slate-700 border border-mist-200',
        coral: 'bg-coral-100 text-coral-700 border border-coral-200',
        mist: 'bg-mist-100 text-mist-700 border border-mist-200',
        slate: 'bg-slate-100 text-slate-700 border border-slate-200',
        outline: 'border border-slate-300 bg-transparent text-slate-600',
        ghost: 'text-slate-600 bg-slate-50',
        success: 'bg-success-100 text-success-700 border border-success-200',
        danger: 'bg-danger-100 text-danger-700 border border-danger-200',
      },
      size: {
        sm: 'h-5 px-2 text-xs',
        md: 'h-6 px-3 text-sm',
        lg: 'h-8 px-4 text-base',
        xl: 'h-10 px-5 text-lg',
      },
      state: {
        default: '',
        disabled: 'opacity-50 cursor-not-allowed',
        selected: 'ring-2 ring-coral-400',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

export interface ChipInputProps
  extends React.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipInputVariants> {
  selected?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  state?: 'default' | 'disabled' | 'selected';
}

const ChipInput = forwardRef<HTMLButtonElement, ChipInputProps>(
  ({ className, variant, size, state, selected, children, removable, onRemove, ...props }, ref) => {
    return (
      <button
        type="button"
        ref={ref}
        className={cn(
          chipInputVariants({ variant, size, state: selected ? 'selected' : state, className }),
          'focus:outline-none focus:ring-2 focus:ring-coral-400',
          selected ? 'shadow-sm' : ''
        )}
        aria-pressed={selected}
        tabIndex={0}
        {...props}
      >
        {children}
        {removable && (
          <span
            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            aria-label="Remove chip"
            tabIndex={-1}
            role="button"
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
          </span>
        )}
      </button>
    );
  }
);

ChipInput.displayName = 'ChipInput';

export { ChipInput, chipInputVariants };
