import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const checkboxVariants = cva(
  'peer h-4 w-4 shrink-0 rounded border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'border-mist-300 text-coral-600 focus:ring-coral-300 checked:bg-coral-500 checked:border-coral-500',
        secondary: 'border-sage-300 text-sage-600 focus:ring-sage-300 checked:bg-sage-500 checked:border-sage-500',
        tertiary: 'border-mist-300 text-mist-600 focus:ring-mist-300 checked:bg-mist-500 checked:border-mist-500',
        outline: 'border-slate-300 text-slate-600 focus:ring-slate-300 checked:bg-slate-500 checked:border-slate-500',
        ghost: 'border-slate-200 text-slate-600 focus:ring-slate-300 checked:bg-slate-400 checked:border-slate-400',

        // Core color variants
        coral: 'border-coral-300 text-coral-600 focus:ring-coral-300 checked:bg-coral-500 checked:border-coral-500',
        sage: 'border-sage-300 text-sage-600 focus:ring-sage-300 checked:bg-sage-500 checked:border-sage-500',
        mist: 'border-mist-300 text-mist-600 focus:ring-mist-300 checked:bg-mist-500 checked:border-mist-500',
        slate: 'border-slate-300 text-slate-600 focus:ring-slate-300 checked:bg-slate-500 checked:border-slate-500',

        // Semantic variants for different states
        success:
          'border-success-300 text-success-600 focus:ring-success-300 checked:bg-success-500 checked:border-success-500',
        info: 'border-info-300 text-info-600 focus:ring-info-300 checked:bg-info-500 checked:border-info-500',
        warning:
          'border-warning-300 text-warning-600 focus:ring-warning-300 checked:bg-warning-500 checked:border-warning-500',
        danger:
          'border-danger-300 text-danger-600 focus:ring-danger-300 checked:bg-danger-500 checked:border-danger-500',
        error:
          'border-danger-300 text-danger-600 focus:ring-danger-300 checked:bg-danger-500 checked:border-danger-500',
      },
      size: {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
        xl: 'h-6 w-6',
      },
      state: {
        default: '',
        disabled: 'bg-cream-100 border-slate-200 cursor-not-allowed checked:bg-cream-200 checked:border-cream-200',
        error: 'border-danger-400 focus:ring-danger-400 checked:bg-danger-500 checked:border-danger-500',
        success: 'border-success-400 focus:ring-success-400 checked:bg-success-500 checked:border-success-500',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

const checkboxLabelVariants = cva(
  'peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-sm font-medium leading-none cursor-pointer',
  {
    variants: {
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
        xl: 'text-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof checkboxVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  showLabel?: boolean;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  wrapperClassName?: string;
  checkboxSize?: 'sm' | 'md' | 'lg' | 'xl';
  labelPosition?: 'left' | 'right';
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      variant,
      size,
      state,
      label,
      helperText,
      errorText,
      showLabel = true,
      labelClassName,
      helperClassName,
      errorClassName,
      wrapperClassName,
      disabled,
      checkboxSize,
      labelPosition = 'right',
      ...props
    },
    ref
  ) => {
    // Determine the actual state based on props
    const actualState = disabled ? 'disabled' : errorText ? 'error' : state;
    // Use checkboxSize if provided, otherwise fall back to size
    const actualSize = checkboxSize ?? size;

    // Get the appropriate checkmark color based on variant
    const getCheckmarkColor = () => {
      if (actualState === 'disabled') return 'text-slate-400';

      switch (variant) {
        case 'coral':
        case 'default':
          return 'text-white';
        case 'sage':
        case 'secondary':
          return 'text-white';
        case 'mist':
        case 'tertiary':
          return 'text-slate-700';
        case 'slate':
        case 'outline':
          return 'text-white';
        case 'ghost':
          return 'text-white';
        case 'success':
          return 'text-white';
        case 'info':
          return 'text-white';
        case 'warning':
          return 'text-slate-700';
        case 'danger':
        case 'error':
          return 'text-white';
        default:
          return 'text-white';
      }
    };

    const checkboxElement = (
      <div className="relative">
        <input
          type="checkbox"
          ref={ref}
          className={cn(checkboxVariants({ variant, size: actualSize, state: actualState }), className)}
          disabled={disabled}
          aria-invalid={actualState === 'error'}
          aria-describedby={errorText ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        />
        {/* Checkmark icon */}
        <div className="pointer-events-none absolute inset-0 hidden peer-checked:flex items-center justify-center">
          <svg
            className={cn(
              getCheckmarkColor(),
              actualSize === 'sm' && 'h-2 w-2',
              actualSize === 'md' && 'h-2.5 w-2.5',
              actualSize === 'lg' && 'h-3 w-3',
              actualSize === 'xl' && 'h-3.5 w-3.5'
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );

    const labelElement = label && showLabel && (
      <label
        htmlFor={props.id}
        className={cn(
          checkboxLabelVariants({ size: actualSize }),
          actualState === 'error' ? 'text-danger-700' : 'text-slate-700',
          disabled && 'text-slate-400',
          labelClassName
        )}
      >
        {label}
      </label>
    );

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Checkbox and Label Container */}
        <div className="flex items-center space-x-2">
          {labelPosition === 'left' && labelElement}
          {checkboxElement}
          {labelPosition === 'right' && labelElement}
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

Checkbox.displayName = 'Checkbox';

export { Checkbox, checkboxVariants };
