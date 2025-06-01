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

  const { activeTab, onTabChange, variant } = context;
  const isActive = activeTab === value;

  const handleClick = () => {
    if (!disabled) {
      onTabChange(value);
    }
  };

  const baseClasses =
    'px-4 py-2 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

  const variantClasses = {
    underline: cn(
      'border-b-2 border-transparent hover:text-blue-600',
      isActive ? 'border-blue-500 text-blue-600' : 'text-gray-600',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    tabs: cn(
      'rounded-md',
      isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    ghost: cn(
      'rounded-md hover:bg-gray-100',
      isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
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
        variantClasses[variant],
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className
      )}
    >
      {children}
    </button>
  );
}
