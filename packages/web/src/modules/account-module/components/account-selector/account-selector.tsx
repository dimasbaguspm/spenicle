import { cva, type VariantProps } from 'class-variance-authority';
import { CreditCard } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '../../../../libs/utils';
import type { Account } from '../../../../types/api';
import { AccountIcon } from '../account-icon';

import { AccountSelectorModal } from './account-selector-modal';

const accountSelectorVariants = cva(
  'w-full rounded border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-400',
  {
    variants: {
      variant: {
        default: 'border-mist-300 bg-white text-slate-700 focus:border-coral-400 focus:ring-coral-300',
        secondary: 'border-sage-300 bg-sage-50 text-slate-700 focus:border-sage-400 focus:ring-sage-300',
        tertiary: 'border-mist-300 bg-mist-50 text-slate-700 focus:border-mist-400 focus:ring-mist-300',
        outline: 'border-slate-300 bg-transparent text-slate-700 focus:border-slate-400 focus:ring-slate-300',
        ghost: 'border-transparent bg-slate-50 text-slate-700 focus:border-slate-300 focus:ring-slate-300',
        coral: 'border-coral-300 bg-coral-50 text-slate-700 focus:border-coral-400 focus:ring-coral-300',
        sage: 'border-sage-300 bg-sage-50 text-slate-700 focus:border-sage-400 focus:ring-sage-300',
        mist: 'border-mist-300 bg-mist-50 text-slate-700 focus:border-mist-400 focus:ring-mist-300',
        slate: 'border-slate-300 bg-slate-50 text-slate-700 focus:border-slate-400 focus:ring-slate-300',
        success: 'border-success-300 bg-success-50 text-slate-700 focus:border-success-400 focus:ring-success-300',
        info: 'border-info-300 bg-info-50 text-slate-700 focus:border-info-400 focus:ring-info-300',
        warning: 'border-warning-300 bg-warning-50 text-slate-700 focus:border-warning-400 focus:ring-warning-300',
        danger: 'border-danger-300 bg-danger-50 text-slate-700 focus:border-danger-400 focus:ring-danger-300',
        error: 'border-danger-300 bg-danger-50 text-slate-700 focus:border-danger-400 focus:ring-danger-300',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-4 text-base',
        xl: 'h-14 px-5 text-lg',
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

export interface AccountSelectorProps extends VariantProps<typeof accountSelectorVariants> {
  value?: Account | null;
  onChange?: (account: Account | null) => void;
  accounts: Account[];
  placeholder?: string;
  label?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  showLabel?: boolean;
  labelClassName?: string;
  helperClassName?: string;
  errorClassName?: string;
  wrapperClassName?: string;
  className?: string;
  id?: string;
  name?: string;
}

export function AccountSelector({
  value,
  onChange,
  accounts,
  placeholder = 'Select an account...',
  label,
  helperText,
  errorText,
  disabled = false,
  showLabel = true,
  labelClassName,
  helperClassName,
  errorClassName,
  wrapperClassName,
  className,
  id,
  name,
  variant,
  size,
}: AccountSelectorProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const displayValue = value?.name ?? '';

  const handleButtonClick = () => {
    if (!disabled) setInternalIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      setInternalIsOpen(true);
    }
  };

  const handleClose = () => setInternalIsOpen(false);

  const handleSelect = (account: Account) => {
    onChange?.(account);
    setInternalIsOpen(false);
  };

  const handleClear = () => {
    onChange?.(null);
    setInternalIsOpen(false);
  };

  const actualState = disabled ? 'disabled' : errorText ? 'error' : undefined;
  const actualSize = size;

  return (
    <div className={cn('w-full', wrapperClassName)}>
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
      <button
        type="button"
        id={id}
        name={name}
        className={cn(
          accountSelectorVariants({ variant, size: actualSize, state: actualState }),
          'relative flex items-center w-full text-left pl-12 pr-10',
          disabled && 'cursor-not-allowed',
          className
        )}
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={internalIsOpen}
        aria-controls={id ? `${id}-account-modal` : undefined}
      >
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <AccountIcon
            iconValue={value?.metadata?.icon}
            colorValue={value?.metadata?.color}
            className="shadow-none h-5 w-5"
            size="xs"
          />
        </span>
        <span className={cn('truncate', !displayValue && 'text-slate-400')}>{displayValue || placeholder}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <CreditCard className={cn('h-4 w-4 text-slate-400', disabled && 'text-slate-300')} />
        </span>
      </button>
      {helperText && !errorText && (
        <p id={id ? `${id}-helper` : undefined} className={cn('mt-2 text-xs text-slate-500', helperClassName)}>
          {helperText}
        </p>
      )}
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
      {internalIsOpen && (
        <AccountSelectorModal
          isOpen={internalIsOpen}
          accounts={accounts}
          value={value ?? null}
          onSelect={handleSelect}
          onClear={handleClear}
          onClose={handleClose}
          size={actualSize === 'sm' ? 'sm' : 'md'}
        />
      )}
    </div>
  );
}
