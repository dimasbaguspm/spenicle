import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const switchVariants = cva(
  'relative inline-flex h-6 w-11 items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-slate-200 focus:ring-coral-400 data-[state=checked]:bg-coral-500',
        secondary: 'bg-slate-200 focus:ring-sage-400 data-[state=checked]:bg-sage-500',
        tertiary: 'bg-slate-200 focus:ring-mist-400 data-[state=checked]:bg-mist-500',
        outline: 'bg-slate-200 focus:ring-slate-400 data-[state=checked]:bg-slate-500',
        ghost: 'bg-slate-100 focus:ring-slate-300 data-[state=checked]:bg-slate-400',

        // Core color variants
        coral: 'bg-slate-200 focus:ring-coral-400 data-[state=checked]:bg-coral-500',
        sage: 'bg-slate-200 focus:ring-sage-400 data-[state=checked]:bg-sage-500',
        mist: 'bg-slate-200 focus:ring-mist-400 data-[state=checked]:bg-mist-500',
        slate: 'bg-slate-200 focus:ring-slate-400 data-[state=checked]:bg-slate-500',

        // Semantic variants for different states
        success: 'bg-slate-200 focus:ring-success-400 data-[state=checked]:bg-success-500',
        info: 'bg-slate-200 focus:ring-info-400 data-[state=checked]:bg-info-500',
        warning: 'bg-slate-200 focus:ring-warning-400 data-[state=checked]:bg-warning-500',
        danger: 'bg-slate-200 focus:ring-danger-400 data-[state=checked]:bg-danger-500',
        error: 'bg-slate-200 focus:ring-danger-400 data-[state=checked]:bg-danger-500',
      },
      size: {
        sm: 'h-4 w-7',
        md: 'h-6 w-11',
        lg: 'h-7 w-12',
        xl: 'h-8 w-14',
      },
      state: {
        default: '',
        disabled: 'bg-cream-100 border-slate-200 cursor-not-allowed data-[state=checked]:bg-cream-200',
        error: 'ring-2 ring-danger-200 data-[state=checked]:bg-danger-500',
        success: 'ring-2 ring-success-200 data-[state=checked]:bg-success-500',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

const switchThumbVariants = cva(
  'pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition-transform',
  {
    variants: {
      size: {
        sm: 'h-3 w-3 data-[state=checked]:translate-x-3',
        md: 'h-5 w-5 data-[state=checked]:translate-x-5',
        lg: 'h-5 w-5 data-[state=checked]:translate-x-5',
        xl: 'h-6 w-6 data-[state=checked]:translate-x-6',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof switchVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  showLabel?: boolean;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  wrapperClassName?: string;
  switchSize?: 'sm' | 'md' | 'lg' | 'xl';
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
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
      switchSize,
      checked = false,
      onCheckedChange,
      onClick,
      ...props
    },
    ref
  ) => {
    // Determine the actual state based on props
    const actualState = disabled ? 'disabled' : errorText ? 'error' : state;
    // Use switchSize if provided, otherwise fall back to size
    const actualSize = switchSize ?? size;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        onCheckedChange?.(!checked);
        onClick?.(event);
      }
    };

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && showLabel && (
          <label
            htmlFor={props.id}
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

        {/* Switch */}
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          data-state={checked ? 'checked' : 'unchecked'}
          className={cn(switchVariants({ variant, size: actualSize, state: actualState }), className)}
          disabled={disabled}
          onClick={handleClick}
          aria-invalid={actualState === 'error'}
          aria-describedby={errorText ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        >
          <span
            data-state={checked ? 'checked' : 'unchecked'}
            className={cn(switchThumbVariants({ size: actualSize }))}
          />
        </button>

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

Switch.displayName = 'Switch';

export { Switch, switchVariants };
