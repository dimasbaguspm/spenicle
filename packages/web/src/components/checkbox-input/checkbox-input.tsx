import { cva, type VariantProps } from 'class-variance-authority';
import { Minus } from 'lucide-react';
import { forwardRef, type InputHTMLAttributes, useEffect, useId } from 'react';

import { cn } from '../../libs/utils';

const checkboxInputVariants = cva(
  'w-4 h-4 align-middle transition-colors duration-200 border rounded-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:transition-none',
  {
    variants: {
      variant: {
        coral: 'border-coral-400 bg-coral-50 accent-coral-600 focus:ring-coral-300',
        sage: 'border-sage-400 bg-sage-50 accent-sage-600 focus:ring-sage-300',
        mist: 'border-mist-400 bg-mist-50 accent-mist-600 focus:ring-mist-300',
        danger: 'border-danger-400 bg-danger-50 accent-danger-600 focus:ring-danger-400',
        slate: 'border-slate-400 bg-slate-50 accent-slate-700 focus:ring-slate-300',
        default: 'border-mist-300 bg-white accent-coral-600 focus:ring-coral-300',
      },
      error: {
        true: 'border-danger-400 focus:ring-danger-400',
        false: '',
      },
      indeterminate: {
        true: '', // can add specific styles if needed
        false: '',
      },
    },
    defaultVariants: {
      variant: 'coral',
      error: false,
      indeterminate: false,
    },
  }
);

export interface CheckboxInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof checkboxInputVariants> {
  label?: string;
  labelClassName?: string;
  wrapperClassName?: string;
  errorText?: string;
  indeterminate?: boolean;
}

const CheckboxInput = forwardRef<HTMLInputElement, CheckboxInputProps>(
  (
    {
      label,
      labelClassName,
      wrapperClassName,
      error,
      errorText,
      className,
      disabled,
      variant,
      indeterminate,
      ...props
    },
    ref
  ) => {
    // set indeterminate state on input
    useEffect(() => {
      if (ref && typeof ref !== 'function' && ref?.current) {
        ref.current.indeterminate = !!indeterminate;
      }
    }, [ref, indeterminate]);
    const autoId = useId();
    const inputId = props.id ?? autoId;
    return (
      <div className={cn('flex items-center gap-2', wrapperClassName)}>
        <span className="relative flex w-4 h-4">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className={cn(
              checkboxInputVariants({ variant, error: !!error, indeterminate: !!indeterminate }),
              'transition-all duration-200 motion-reduce:transition-none',
              className
            )}
            disabled={disabled}
            aria-invalid={!!error}
            {...props}
          />
          {/* lucide minus icon for indeterminate state */}
          {indeterminate && (
            <span
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-white"
              aria-hidden="true"
            >
              <Minus
                size={16}
                strokeWidth={4}
                className={cn(
                  variant === 'coral' && 'bg-coral-600',
                  variant === 'sage' && 'bg-sage-600',
                  variant === 'mist' && 'bg-mist-600',
                  variant === 'danger' && 'bg-danger-600',
                  variant === 'slate' && 'bg-slate-700',
                  !variant && 'bg-coral-600'
                )}
                focusable={false}
                aria-label="indeterminate"
              />
            </span>
          )}
        </span>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium select-none cursor-pointer',
              error ? 'text-danger-700' : 'text-slate-700',
              disabled && 'text-slate-400',
              labelClassName
            )}
          >
            {label}
          </label>
        )}
        {errorText && <span className="ml-2 text-xs text-danger-600">{errorText}</span>}
      </div>
    );
  }
);

CheckboxInput.displayName = 'CheckboxInput';

export { CheckboxInput, checkboxInputVariants };
