import React, { useContext } from 'react';

import { cn } from '../../libs/utils';

import { TabContext } from './tab-context';

export interface TabTriggerProps {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export function TabTrigger({ children, value, disabled = false, className }: TabTriggerProps) {
  const context = useContext(TabContext);

  if (!context) {
    throw new Error('TabTrigger must be used within a Tab component');
  }

  const { activeTab, onTabChange, type, variant } = context;
  const isActive = activeTab === value;

  const handleClick = () => {
    if (!disabled) {
      onTabChange(value);
    }
  };

  const baseClasses =
    'px-4 py-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2';

  const typeClasses = {
    underline: cn(
      'border-b-2 border-transparent hover:text-coral-600',
      isActive ? 'border-coral-500 text-coral-600' : 'text-slate-600',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    tabs: cn(
      'rounded-md',
      isActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    ghost: cn(
      'rounded-md hover:bg-cream-100',
      isActive ? 'bg-cream-100 text-slate-900' : 'text-slate-600',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
  };

  // Color palette variants (coral, sage, etc.)
  const colorVariantClasses: Record<string, string> = {
    coral: isActive ? 'text-coral-600 border-coral-500' : 'text-coral-500 hover:text-coral-600',
    sage: isActive ? 'text-sage-600 border-sage-500' : 'text-sage-500 hover:text-sage-600',
    mist: isActive ? 'text-mist-600 border-mist-500' : 'text-mist-500 hover:text-mist-600',
    slate: isActive ? 'text-slate-700 border-slate-600' : 'text-slate-600 hover:text-slate-700',
    success: isActive ? 'text-success-600 border-success-500' : 'text-success-500 hover:text-success-600',
    info: isActive ? 'text-info-600 border-info-500' : 'text-info-500 hover:text-info-600',
    warning: isActive ? 'text-warning-600 border-warning-500' : 'text-warning-500 hover:text-warning-600',
    danger: isActive ? 'text-danger-600 border-danger-500' : 'text-danger-500 hover:text-danger-600',
  };

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        baseClasses,
        typeClasses[type],
        variant ? colorVariantClasses[variant] : '',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      {children}
    </button>
  );
}
