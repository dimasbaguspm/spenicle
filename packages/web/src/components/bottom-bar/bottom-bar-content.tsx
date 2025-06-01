import React from 'react';

import { cn } from '../../libs/utils';

export interface BottomBarContentProps {
  children: React.ReactNode;
  className?: string;
  layout?: 'center' | 'space-between' | 'space-around' | 'start' | 'end';
}

const layoutClasses = {
  center: 'justify-center items-center',
  'space-between': 'justify-between items-center',
  'space-around': 'justify-around items-center',
  start: 'justify-start items-center',
  end: 'justify-end items-center',
} as const;

export function BottomBarContent({ children, className, layout = 'space-between' }: BottomBarContentProps) {
  return <div className={cn('flex w-full', layoutClasses[layout], className)}>{children}</div>;
}
