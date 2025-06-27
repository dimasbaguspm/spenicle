import { cva } from 'class-variance-authority';
import React from 'react';

import { cn } from '../../../libs/utils';
import type { BadgeIconProps } from '../types';

const badgeIconVariants = cva('flex-shrink-0', {
  variants: {
    size: {
      sm: 'h-3 w-3',
      md: 'h-3.5 w-3.5',
      lg: 'h-4 w-4',
      xl: 'h-4 w-4',
    },
    position: {
      left: 'mr-1',
      right: 'ml-1',
    },
  },
  defaultVariants: {
    size: 'md',
    position: 'left',
  },
});

export const BadgeIcon: React.FC<BadgeIconProps> = ({
  icon: IconComponent,
  size = 'md',
  position = 'left',
  className,
  ...props
}) => {
  return (
    <IconComponent
      className={cn(badgeIconVariants({ size, position }), className)}
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
};
