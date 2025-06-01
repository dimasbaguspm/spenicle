import { forwardRef } from 'react';

import { cn } from '../../libs/utils';

export interface UserMenuPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export const UserMenuPanel = forwardRef<HTMLDivElement, UserMenuPanelProps>(
  ({ className, title, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-3', className)} {...props}>
        {title && <h3 className="text-lg font-semibold">{title}</h3>}
        <div className="space-y-2">{children}</div>
      </div>
    );
  }
);

UserMenuPanel.displayName = 'UserMenuPanel';
