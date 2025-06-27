import React from 'react';

import { cn } from '../../../libs/utils';
import { SPACING_CLASSES } from '../helpers';
import type { BottomBarGroupProps } from '../types';

export const BottomBarGroup: React.FC<BottomBarGroupProps> = ({ children, className, spacing = 'md', ...props }) => {
  const spacingClass = SPACING_CLASSES[spacing] || SPACING_CLASSES.md;

  return (
    <div
      className={cn('flex items-center', spacingClass, className)}
      role="group"
      aria-label="Bottom bar action group"
      {...props}
    >
      {children}
    </div>
  );
};
