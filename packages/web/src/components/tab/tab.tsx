import React, { useState } from 'react';

import { cn } from '../../libs/utils';

import { TabContext } from './tab-context';

export interface TabProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: 'underline' | 'tabs' | 'ghost';
  className?: string;
}

// Tab Component
export function Tab({ children, defaultValue, value, onValueChange, variant = 'underline', className }: TabProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  const activeTab = value ?? internalValue;

  const handleTabChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabContext.Provider value={{ activeTab, onTabChange: handleTabChange, variant }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabContext.Provider>
  );
}
