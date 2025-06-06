import { cva } from 'class-variance-authority';
import { Calculator } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { cn } from '../../libs/utils';
import { TextInput, type TextInputProps } from '../text-input';

import { CalculatorModal } from './calculator-modal';

const amountFieldVariants = cva('relative', {
  variants: {
    variant: {
      default: 'bg-white border-mist-300 text-slate-700 focus-within:border-coral-400 focus-within:ring-coral-300',
      coral: 'bg-coral-50 border-coral-300 text-slate-700 focus-within:border-coral-400 focus-within:ring-coral-300',
      sage: 'bg-sage-50 border-sage-300 text-slate-700 focus-within:border-sage-400 focus-within:ring-sage-300',
      mist: 'bg-mist-50 border-mist-300 text-slate-700 focus-within:border-mist-400 focus-within:ring-mist-300',
      slate: 'bg-slate-50 border-slate-300 text-slate-700 focus-within:border-slate-400 focus-within:ring-slate-300',
    },
    size: {
      sm: 'h-8',
      md: 'h-10',
      lg: 'h-12',
      xl: 'h-14',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
});

// Only allow the intersection of variant/size keys that are shared between amountFieldVariants and textInputVariants
type AmountFieldVariant = 'default' | 'coral' | 'sage' | 'mist' | 'slate';
type AmountFieldSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AmountFieldProps extends Omit<TextInputProps, 'type' | 'variant' | 'size' | 'onChange'> {
  value?: number | string;
  onChange?: (value: number) => void;
  iconAriaLabel?: string;
  variant?: AmountFieldVariant;
  size?: AmountFieldSize;
}

export const AmountField = React.forwardRef<HTMLInputElement, AmountFieldProps>(
  (
    {
      value,
      onChange,
      placeholder = '0',
      label,
      helperText,
      errorText,
      disabled = false,
      required = false,
      showLabel = true,
      labelClassName,
      helperClassName,
      errorClassName,
      wrapperClassName,
      className,
      id,
      name,
      variant = 'default',
      size = 'md',
      iconAriaLabel = 'Open calculator',
      ...props
    },
    ref
  ) => {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [justClosed, setJustClosed] = useState(false);

    useEffect(() => {
      if (justClosed) {
        const timeout = setTimeout(() => setJustClosed(false), 200);
        return () => clearTimeout(timeout);
      }
    }, [justClosed]);

    const actualState = disabled ? 'disabled' : errorText ? 'error' : undefined;

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* Label */}
        {label && showLabel && (
          <label
            htmlFor={id}
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
        {/* Input + Icon container */}
        <div className={cn('relative', amountFieldVariants({ variant, size }))}>
          <TextInput
            ref={ref}
            id={id}
            name={name}
            type="number"
            step="1" // Only allow integers
            min="0"
            value={value?.toString() ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange?.(parseInt(e.target.value, 10) || 0)}
            placeholder={placeholder ?? '0'}
            disabled={disabled}
            required={required}
            variant={variant}
            size={size}
            className={cn('pr-10', className)}
            aria-invalid={actualState === 'error'}
            aria-describedby={errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            showLabel={false}
            {...props}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
            <button
              type="button"
              tabIndex={disabled ? -1 : 0}
              aria-label={iconAriaLabel}
              className={cn(
                'p-1 rounded hover:bg-slate-100 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-coral-300',
                disabled && 'pointer-events-none'
              )}
              disabled={disabled}
              onClick={() => {
                if (!disabled && !justClosed) setIsCalculatorOpen(true);
              }}
            >
              <Calculator
                className={cn('h-4 w-4 text-slate-400', disabled && 'text-slate-300')}
                aria-hidden="true"
                focusable="false"
              />
            </button>
          </span>
        </div>
        {/* Helper Text */}
        {helperText && !errorText && (
          <p id={id ? `${id}-helper` : undefined} className={cn('mt-2 text-xs text-slate-500', helperClassName)}>
            {helperText}
          </p>
        )}
        {/* Error Text */}
        {errorText && (
          <p
            id={id ? `${id}-error` : undefined}
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
        {/* Calculator Modal */}
        {isCalculatorOpen && (
          <CalculatorModal
            isOpen={isCalculatorOpen}
            initialValue={value?.toString() ?? ''}
            onSubmit={(v) => {
              onChange?.(v);
              setIsCalculatorOpen(false);
              setJustClosed(true);
            }}
            onClose={() => {
              setIsCalculatorOpen(false);
              setJustClosed(true);
            }}
          />
        )}
      </div>
    );
  }
);

AmountField.displayName = 'AmountField';
