import React, { useState } from 'react';

import { cn } from '../../libs/utils';

import { TabContext } from './tab-context';

export interface TabProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  type?: 'underline' | 'tabs' | 'ghost';
  variant?: 'coral' | 'sage' | 'mist' | 'slate' | 'success' | 'info' | 'warning' | 'danger';
  className?: string;
}

// Tab Component
export function Tab({
  children,
  defaultValue,
  value,
  onValueChange,
  type = 'underline',
  variant,
  className,
}: TabProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  const activeTab = value ?? internalValue;

  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabContext.Provider value={{ activeTab, onTabChange: handleTabChange, type, variant }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabContext.Provider>
  );
}
