import { cva } from 'class-variance-authority';
import React from 'react';

import { cn } from '../../../libs/utils';
import { generateInitials, getAvatarBackgroundClass, getAvatarTextClass } from '../helpers';
import type { AvatarFallbackProps } from '../types';

const avatarFallbackVariants = cva('flex h-full w-full items-center justify-center font-medium select-none', {
  variants: {
    size: {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({
  children,
  color = 'coral',
  size = 'md',
  className,
  ...props
}) => {
  // generate initials from children if it's a string, otherwise use children directly
  const displayContent = typeof children === 'string' ? generateInitials(children) : (children ?? '?');

  return (
    <div
      className={cn(
        avatarFallbackVariants({ size }),
        getAvatarBackgroundClass(color),
        getAvatarTextClass(color),
        className
      )}
      role="img"
      aria-label={typeof children === 'string' ? `Avatar for ${children}` : 'Avatar fallback'}
      {...props}
    >
      {displayContent}
    </div>
  );
};
