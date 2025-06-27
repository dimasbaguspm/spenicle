import { cva } from 'class-variance-authority';
import { Calculator } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { cn } from '../../libs/utils';
import { TextInput } from '../text-input';

import { AmountFieldCalculatorModal } from './components/amount-field-calculator-modal';
import { sanitizeNumericInput, formatNumberDisplay, isValidNumber } from './helpers';
import type { AmountFieldProps } from './types';

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

    // prevent immediate reopening after closing calculator
    useEffect(() => {
      if (justClosed) {
        const timeout = setTimeout(() => setJustClosed(false), 200);
        return () => clearTimeout(timeout);
      }
    }, [justClosed]);

    // determine current state for styling and accessibility
    const actualState = disabled ? 'disabled' : errorText ? 'error' : undefined;

    // handle input change with validation and sanitization
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const rawValue = e.target.value;
      const sanitizedValue = sanitizeNumericInput(rawValue);

      // validate input is a safe number
      if (sanitizedValue === '' || isValidNumber(sanitizedValue)) {
        const numericValue = sanitizedValue === '' ? 0 : parseInt(sanitizedValue, 10) || 0;
        onChange?.(numericValue);
      }
    };

    // handle calculator button click
    const handleCalculatorClick = (): void => {
      if (!disabled && !justClosed) {
        setIsCalculatorOpen(true);
      }
    };

    // handle calculator submission
    const handleCalculatorSubmit = (calculatedValue: number): void => {
      onChange?.(calculatedValue);
      setIsCalculatorOpen(false);
      setJustClosed(true);
    };

    // handle calculator close
    const handleCalculatorClose = (): void => {
      setIsCalculatorOpen(false);
      setJustClosed(true);
    };

    return (
      <div className={cn('w-full', wrapperClassName)}>
        {/* label with proper accessibility */}
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
            {required && (
              <span className="text-danger-600 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* input container with calculator button */}
        <div className={cn('relative', amountFieldVariants({ variant, size }))}>
          <TextInput
            ref={ref}
            id={id}
            name={name}
            type="number"
            step="1" // only allow integers for amount fields
            min="0"
            value={formatNumberDisplay(value ?? 0)}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            variant={variant}
            size={size}
            state={actualState}
            className={cn('pr-10', className)}
            aria-invalid={actualState === 'error'}
            aria-describedby={errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined}
            showLabel={false}
            {...props}
          />

          {/* calculator button with proper accessibility */}
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
              onClick={handleCalculatorClick}
            >
              <Calculator
                className={cn('h-4 w-4 text-slate-400', disabled && 'text-slate-300')}
                aria-hidden="true"
                focusable="false"
              />
            </button>
          </span>
        </div>

        {/* helper text for additional context */}
        {helperText && !errorText && (
          <p id={id ? `${id}-helper` : undefined} className={cn('mt-2 text-xs text-slate-500', helperClassName)}>
            {helperText}
          </p>
        )}

        {/* error message with icon for accessibility */}
        {errorText && (
          <p
            id={id ? `${id}-error` : undefined}
            className={cn('mt-2 text-xs text-danger-600 flex items-center gap-1', errorClassName)}
            role="alert"
            aria-live="polite"
          >
            <svg
              className="h-3 w-3 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
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

        {/* calculator modal - rendered conditionally for performance */}
        {isCalculatorOpen && (
          <AmountFieldCalculatorModal
            isOpen={isCalculatorOpen}
            initialValue={formatNumberDisplay(value ?? 0)}
            onSubmit={handleCalculatorSubmit}
            onClose={handleCalculatorClose}
          />
        )}
      </div>
    );
  }
);

AmountField.displayName = 'AmountField';
