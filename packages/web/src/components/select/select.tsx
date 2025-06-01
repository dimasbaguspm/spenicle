import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const selectVariants = cva(
  'w-full rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 bg-white appearance-none cursor-pointer',
  {
    variants: {
      variant: {
        default: 'border-mist-300 bg-white text-slate-700 focus:border-coral-400 focus:ring-coral-300',
        secondary: 'border-sage-300 bg-sage-50 text-slate-700 focus:border-sage-400 focus:ring-sage-300',
        tertiary: 'border-mist-300 bg-mist-50 text-slate-700 focus:border-mist-400 focus:ring-mist-300',
        outline: 'border-slate-300 bg-transparent text-slate-700 focus:border-slate-400 focus:ring-slate-300',
        ghost: 'border-transparent bg-slate-50 text-slate-700 focus:border-slate-300 focus:ring-slate-300',

        // Core color variants
        coral: 'border-coral-300 bg-coral-50 text-slate-700 focus:border-coral-400 focus:ring-coral-300',
        sage: 'border-sage-300 bg-sage-50 text-slate-700 focus:border-sage-400 focus:ring-sage-300',
        mist: 'border-mist-300 bg-mist-50 text-slate-700 focus:border-mist-400 focus:ring-mist-300',
        slate: 'border-slate-300 bg-slate-50 text-slate-700 focus:border-slate-400 focus:ring-slate-300',

        // Semantic variants for different states
        success: 'border-success-300 bg-success-50 text-slate-700 focus:border-success-400 focus:ring-success-300',
        info: 'border-info-300 bg-info-50 text-slate-700 focus:border-info-400 focus:ring-info-300',
        warning: 'border-warning-300 bg-warning-50 text-slate-700 focus:border-warning-400 focus:ring-warning-300',
        danger: 'border-danger-300 bg-danger-50 text-slate-700 focus:border-danger-400 focus:ring-danger-300',
        error: 'border-danger-300 bg-danger-50 text-slate-700 focus:border-danger-400 focus:ring-danger-300',
      },
      size: {
        sm: 'h-8 px-3 text-xs pr-8',
        md: 'h-10 px-4 text-sm pr-10',
        lg: 'h-12 px-4 text-base pr-10',
        xl: 'h-14 px-5 text-lg pr-12',
      },
      state: {
        default: '',
        disabled: 'bg-cream-100 text-slate-400 border-slate-200 cursor-not-allowed',
        error: 'border-danger-400 bg-danger-50 focus:border-danger-500 focus:ring-danger-400',
        success: 'border-success-400 bg-success-50 focus:border-success-500 focus:ring-success-400',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
    },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  showLabel?: boolean;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  wrapperClassName?: string;
  selectSize?: 'sm' | 'md' | 'lg' | 'xl';
  placeholder?: string;
  options?: Array<{ value: string | number; label: string; disabled?: boolean }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
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
      selectSize,
      placeholder,
      options = [],
      children,
      ...props
    },
    ref
  ) => {
    // Determine the actual state based on props
    const actualState = disabled ? 'disabled' : errorText ? 'error' : state;
    // Use selectSize if provided, otherwise fall back to size
    const actualSize = selectSize ?? size;

    // Generate chevron size based on select size
    const chevronSize = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-4 w-4',
      xl: 'h-5 w-5',
    }[actualSize ?? 'md'];

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

        {/* Select Container */}
        <div className="relative">
          <select
            ref={ref}
            className={cn(selectVariants({ variant, size: actualSize, state: actualState }), className)}
            disabled={disabled}
            aria-invalid={actualState === 'error'}
            aria-describedby={errorText ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            {...props}
          >
            {/* Placeholder option */}
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {/* Options from props */}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}

            {/* Children options */}
            {children}
          </select>

          {/* Chevron Icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className={cn(
                chevronSize,
                actualState === 'error' ? 'text-danger-400' : 'text-slate-400',
                disabled && 'text-slate-300'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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

Select.displayName = 'Select';

export { Select, selectVariants };
