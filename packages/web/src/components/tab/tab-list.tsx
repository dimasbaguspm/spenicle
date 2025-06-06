import React, { useContext } from 'react';

import { cn } from '../../libs/utils';

import { TabContext } from './tab-context';

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabList({ children, className }: TabListProps) {
  const context = useContext(TabContext);

  if (!context) {
    throw new Error('TabList must be used within a Tab component');
  }

  const { type } = context;

  const typeClasses = {
    underline: 'border-b border-gray-200',
    tabs: 'bg-gray-100 rounded-lg p-1',
    ghost: '',
  };

  // Add color variant support if needed in the future

  return (
    <div className={cn('flex', typeClasses[type], className)} role="tablist">
      {children}
    </div>
  );
}
