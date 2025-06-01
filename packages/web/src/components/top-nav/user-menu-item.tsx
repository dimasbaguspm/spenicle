import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

export interface UserMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'danger';
}

export const UserMenuItem = forwardRef<HTMLButtonElement, UserMenuItemProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantClasses = {
      default: 'text-gray-700 hover:bg-gray-100',
      danger: 'text-red-600 hover:bg-red-50',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'block w-full text-left px-3 py-2 text-sm rounded transition-colors',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

UserMenuItem.displayName = 'UserMenuItem';
