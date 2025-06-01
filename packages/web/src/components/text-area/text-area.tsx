import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

const textAreaVariants = cva(
  'w-full rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-400 resize-y',
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
        sm: 'min-h-[80px] px-3 py-2 text-xs',
        md: 'min-h-[100px] px-4 py-3 text-sm',
        lg: 'min-h-[120px] px-4 py-3 text-base',
        xl: 'min-h-[140px] px-5 py-4 text-lg',
      },
      state: {
        default: '',
        disabled: 'bg-cream-100 text-slate-400 border-slate-200 cursor-not-allowed resize-none',
        error: 'border-danger-400 bg-danger-50 focus:border-danger-500 focus:ring-danger-400',
        success: 'border-success-400 bg-success-50 focus:border-success-500 focus:ring-success-400',
      },
      resize: {
        none: 'resize-none',
        y: 'resize-y',
        x: 'resize-x',
        both: 'resize',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      state: 'default',
      resize: 'y',
    },
  }
);

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textAreaVariants> {
  label?: string;
  helperText?: string;
  errorText?: string;
  showLabel?: boolean;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  wrapperClassName?: string;
  textareaSize?: 'sm' | 'md' | 'lg' | 'xl';
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      variant,
      size,
      state,
      resize,
      label,
      helperText,
      errorText,
      showLabel = true,
      labelClassName,
      helperClassName,
      errorClassName,
      wrapperClassName,
      disabled,
      textareaSize,
      ...props
    },
    ref
  ) => {
    // Determine the actual state based on props
    const actualState = disabled ? 'disabled' : errorText ? 'error' : state;
    // Use textareaSize if provided, otherwise fall back to size
    const actualSize = textareaSize ?? size;

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

        {/* TextArea */}
        <textarea
          ref={ref}
          className={cn(textAreaVariants({ variant, size: actualSize, state: actualState, resize }), className)}
          disabled={disabled}
          aria-invalid={actualState === 'error'}
          aria-describedby={errorText ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        />

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

TextArea.displayName = 'TextArea';

export { TextArea, textAreaVariants };
