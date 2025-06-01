import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

export type UserMenuSeparatorProps = React.HTMLAttributes<HTMLHRElement>;

export const UserMenuSeparator = forwardRef<HTMLHRElement, UserMenuSeparatorProps>(({ className, ...props }, ref) => {
  return <hr ref={ref} className={cn('border-gray-200 my-1', className)} {...props} />;
});

UserMenuSeparator.displayName = 'UserMenuSeparator';
