import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const segmentVariants = cva(
  'relative inline-flex items-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-cream-50 border-mist-200 focus:ring-coral-400',
        secondary: 'bg-cream-50 border-mist-200 focus:ring-sage-400',
        tertiary: 'bg-cream-50 border-mist-200 focus:ring-mist-400',
        outline: 'bg-transparent border-slate-300 focus:ring-slate-400',
        ghost: 'bg-transparent border-transparent focus:ring-slate-300',

        // Core color variants
        coral: 'bg-cream-50 border-coral-200 focus:ring-coral-400',
        sage: 'bg-cream-50 border-sage-200 focus:ring-sage-400',
        mist: 'bg-cream-50 border-mist-200 focus:ring-mist-400',
        slate: 'bg-cream-50 border-slate-200 focus:ring-slate-400',

        // Semantic variants for different states
        success: 'bg-cream-50 border-success-200 focus:ring-success-400',
        info: 'bg-cream-50 border-info-200 focus:ring-info-400',
        warning: 'bg-cream-50 border-warning-200 focus:ring-warning-400',
        danger: 'bg-cream-50 border-danger-200 focus:ring-danger-400',
        error: 'bg-cream-50 border-danger-200 focus:ring-danger-400',
      },
      size: {
        sm: 'h-8 p-1 gap-1',
        md: 'h-10 p-1 gap-1',
        lg: 'h-12 p-1.5 gap-1.5',
        xl: 'h-14 p-2 gap-2',
      },
      state: {
        default: '',
        disabled: 'bg-slate-100 border-slate-200 cursor-not-allowed',
        error: 'ring-2 ring-danger-200',
        success: 'ring-2 ring-success-200',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

const segmentItemVariants = cva(
  'flex-1 inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 cursor-pointer select-none whitespace-nowrap min-w-0',
  {
    variants: {
      variant: {
        default:
          'text-slate-600 hover:text-coral-700 data-[active=true]:bg-coral-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        secondary:
          'text-slate-600 hover:text-sage-700 data-[active=true]:bg-sage-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        tertiary:
          'text-slate-600 hover:text-mist-700 data-[active=true]:bg-mist-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        outline:
          'text-slate-600 hover:text-slate-700 data-[active=true]:bg-slate-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        ghost: 'text-slate-600 hover:text-slate-700 data-[active=true]:bg-slate-100 data-[active=true]:text-slate-900',

        // Core color variants
        coral:
          'text-slate-600 hover:text-coral-700 data-[active=true]:bg-coral-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        sage: 'text-slate-600 hover:text-sage-700 data-[active=true]:bg-sage-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        mist: 'text-slate-600 hover:text-mist-700 data-[active=true]:bg-mist-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        slate:
          'text-slate-600 hover:text-slate-700 data-[active=true]:bg-slate-500 data-[active=true]:text-white data-[active=true]:shadow-sm',

        // Semantic variants
        success:
          'text-slate-600 hover:text-success-700 data-[active=true]:bg-success-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        info: 'text-slate-600 hover:text-info-700 data-[active=true]:bg-info-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        warning:
          'text-slate-600 hover:text-warning-700 data-[active=true]:bg-warning-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        danger:
          'text-slate-600 hover:text-danger-700 data-[active=true]:bg-danger-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
        error:
          'text-slate-600 hover:text-danger-700 data-[active=true]:bg-danger-500 data-[active=true]:text-white data-[active=true]:shadow-sm',
      },
      size: {
        sm: 'px-2 py-1 text-xs h-6',
        md: 'px-3 py-1.5 text-sm h-8',
        lg: 'px-4 py-2 text-sm h-9',
        xl: 'px-5 py-2.5 text-base h-10',
      },
      disabled: {
        true: 'pointer-events-none opacity-50 cursor-not-allowed',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      disabled: false,
    },
  }
);

export interface SegmentOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SegmentProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'size'>,
    VariantProps<typeof segmentVariants> {
  options: SegmentOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  label?: string;
  helperText?: string;
  errorText?: string;
  showLabel?: boolean;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  wrapperClassName?: string;
  segmentSize?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

const Segment = forwardRef<HTMLDivElement, SegmentProps>(
  (
    {
      className,
      variant,
      size,
      state,
      options,
      value,
      onValueChange,
      label,
      helperText,
      errorText,
      showLabel = true,
      labelClassName,
      helperClassName,
      errorClassName,
      wrapperClassName,
      disabled,
      segmentSize,
      ...props
    },
    ref
  ) => {
    // Determine the actual state based on props
    const actualState = disabled ? 'disabled' : errorText ? 'error' : state;
    // Use segmentSize if provided, otherwise fall back to size
    const actualSize = segmentSize ?? size;

    const handleItemClick = (itemValue: string, itemDisabled?: boolean) => {
      if (!disabled && !itemDisabled && onValueChange) {
        onValueChange(itemValue);
      }
    };

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && showLabel && (
          <label
            className={cn(
              'block text-sm font-medium mb-2',
              actualState === 'error' ? 'text-danger-700' : 'text-slate-700',
              disabled && 'text-slate-400',
              labelClassName
            )}
          >
            {label}
          </label>
        )}

        {/* Segment */}
        <div
          ref={ref}
          role="radiogroup"
          className={cn(segmentVariants({ variant, size: actualSize, state: actualState }), className)}
          aria-invalid={actualState === 'error'}
          aria-describedby={errorText ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        >
          {options.map((option) => {
            const isActive = value === option.value;
            const isItemDisabled = disabled ?? option.disabled;

            return (
              <div
                key={option.value}
                role="radio"
                aria-checked={isActive}
                data-active={isActive}
                tabIndex={isItemDisabled ? -1 : 0}
                className={cn(
                  segmentItemVariants({
                    variant,
                    size: actualSize,
                    disabled: isItemDisabled,
                  })
                )}
                onClick={() => handleItemClick(option.value, option.disabled)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemClick(option.value, option.disabled);
                  }
                }}
              >
                {option.icon && (
                  <span className={cn('flex-shrink-0', actualSize === 'sm' ? 'mr-1' : 'mr-1.5')}>{option.icon}</span>
                )}
                <span className="truncate">{option.label}</span>
              </div>
            );
          })}
        </div>

        {/* Helper Text */}
        {helperText && !errorText && (
          <p
            id={props.id ? `${props.id}-helper` : undefined}
            className={cn('mt-2 text-xs text-slate-500', helperClassName)}
          >
            {helperText}
          </p>
        )}

        {/* Error Text */}
        {errorText && (
          <p
            id={props.id ? `${props.id}-error` : undefined}
            className={cn('mt-2 text-xs text-danger-600 flex items-center gap-1', errorClassName)}
          >
            <svg
              className="h-3 w-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {errorText}
          </p>
        )}
      </div>
    );
  }
);

Segment.displayName = 'Segment';

export { Segment, segmentVariants, segmentItemVariants };
