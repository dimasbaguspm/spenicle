import React from 'react';

import { cn } from '../../../libs/utils';
import type { BottomBarContentProps } from '../types';

const alignClasses = {
  left: 'justify-start items-center',
  center: 'justify-center items-center',
  right: 'justify-end items-center',
  justify: 'justify-between items-center',
} as const;

export const BottomBarContent: React.FC<BottomBarContentProps> = ({
  children,
  className,
  align = 'justify',
  ...props
}) => {
  return (
    <div
      className={cn('flex w-full', alignClasses[align], className)}
      role="group"
      aria-label="Bottom bar content"
      {...props}
    >
      {children}
    </div>
  );
};
