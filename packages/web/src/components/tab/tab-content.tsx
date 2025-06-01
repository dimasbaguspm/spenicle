import React, { useContext } from 'react';

import { cn } from '../../libs/utils';

import { TabContext } from './tab-context';

export interface TabContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export function TabContent({ children, value, className }: TabContentProps) {
  const context = useContext(TabContext);

  if (!context) {
    throw new Error('TabContent must be used within a Tab component');
  }

  const { activeTab } = context;
  const isActive = activeTab === value;

  if (!isActive) {
    return null;
  }

  return (
    <div role="tabpanel" id={`tabpanel-${value}`} aria-labelledby={`tab-${value}`} className={cn('mt-4', className)}>
      {children}
    </div>
  );
}
