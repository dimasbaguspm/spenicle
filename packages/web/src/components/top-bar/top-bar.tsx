import type { FC, ReactNode } from 'react';

import { cn } from '../../libs/utils';

// slot-based modular top bar for desktop view
// accepts logo, search, nav, actions, avatar as props
// uses flex layout, color palette, and spacing scale
// does not handle any logic or state

export interface TopBarProps {
  actionLeft?: ReactNode;
  logo?: ReactNode;
  search?: ReactNode;
  actions?: ReactNode;
  avatar?: ReactNode;
  className?: string;
}

export const TopBar: FC<TopBarProps> = ({ actionLeft, logo, search, actions, avatar, className }) => {
  return (
    <header
      className={cn('w-full bg-white border-b border-mist-200', 'flex items-center h-16 px-6 gap-4', className)}
      role="banner"
    >
      {/* far left: actionLeft */}
      {actionLeft && <div className="flex items-center min-w-[44px] justify-center">{actionLeft}</div>}
      {/* left: logo */}
      <div className="flex items-center min-w-[180px]">{logo}</div>
      {/* right: search, actions, avatar */}
      <div className="flex items-center gap-2 min-w-[120px] justify-end flex-1">
        {search && <div className="w-72 max-w-full">{search}</div>}
        <div className="flex items-center gap-3">
          {actions}
          {avatar && <div className="ml-2">{avatar}</div>}
        </div>
      </div>
    </header>
  );
};
