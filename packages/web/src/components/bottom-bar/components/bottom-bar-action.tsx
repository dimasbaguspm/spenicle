import React from 'react';

import { cn } from '../../../libs/utils';
import { getActionVariantClasses } from '../helpers';
import type { BottomBarActionProps } from '../types';

export const BottomBarAction: React.FC<BottomBarActionProps> = ({
  children,
  className,
  variant = 'default',
  onClick,
  disabled = false,
  ...props
}) => {
  const variantClasses = getActionVariantClasses(variant);

  return (
    <div
      className={cn(
        variantClasses,
        disabled && 'opacity-50 pointer-events-none',
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={disabled ? undefined : onClick}
      role={onClick ? 'button' : undefined}
      aria-disabled={disabled}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={
        onClick && !disabled
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
};
