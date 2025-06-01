import { forwardRef } from 'react';

import { cn } from '../../libs/utils';
import { Avatar, type AvatarProps } from '../avatar';

export interface UserAvatarProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  src?: string;
  alt?: string;
  size?: AvatarProps['size'];
  fallback?: string;
}

export const UserAvatar = forwardRef<HTMLButtonElement, UserAvatarProps>(
  ({ className, src, alt = 'User avatar', size = 'md', fallback, onClick, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300',
          className
        )}
        onClick={onClick}
        aria-label="User profile"
        {...props}
      >
        <Avatar src={src} alt={alt} size={size} fallback={fallback ?? 'User'} />
      </button>
    );
  }
);

UserAvatar.displayName = 'UserAvatar';
