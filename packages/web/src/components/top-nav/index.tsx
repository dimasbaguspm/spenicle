import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useState, useRef } from 'react';

import { cn } from '../../libs/utils';
import { Popover } from '../popover';

import { MenuItem, type MenuItemProps } from './menu-item';
import { UserAvatar } from './user-avatar';
import { UserMenuItem } from './user-menu-item';
import { UserMenuPanel } from './user-menu-panel';
import { UserMenuSeparator } from './user-menu-separator';

const topNavVariants = cva(
  'w-full flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm',
  {
    variants: {
      size: {
        sm: 'h-12',
        md: 'h-16',
        lg: 'h-20',
      },
      sticky: {
        true: 'sticky top-0 z-50',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      sticky: true,
    },
  }
);

export interface TopNavProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof topNavVariants> {
  menuItems?: MenuItemProps[];
  avatarSrc?: string;
  panelContent?: React.ReactNode;
  onProfileClick?: () => void;
  onSettingsClick?: () => void;
  onSignOutClick?: () => void;
}

export const TopNav = forwardRef<HTMLDivElement, TopNavProps>(
  (
    {
      className,
      menuItems,
      avatarSrc,
      panelContent,
      onProfileClick,
      onSettingsClick,
      onSignOutClick,
      size,
      sticky,
      ...props
    },
    ref
  ) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const avatarRef = useRef<HTMLButtonElement>(null);

    return (
      <>
        <div ref={ref} className={cn(topNavVariants({ size, sticky }), className)} {...props}>
          <div className="container mx-auto flex items-center justify-between px-4">
            {/* Left spacer for centering */}
            <div className="w-10"></div>

            {/* Centered menu items */}
            <nav className="flex items-center justify-center flex-1">
              {menuItems && menuItems.length > 0 && (
                <div className="flex space-x-8">
                  {menuItems.map((item) => (
                    <MenuItem key={item.href} {...item} />
                  ))}
                </div>
              )}
            </nav>

            {/* Right aligned user avatar */}
            <div className="flex items-center relative">
              <UserAvatar ref={avatarRef} src={avatarSrc} onClick={() => setIsPanelOpen(!isPanelOpen)} />

              {/* User Popover */}
              <Popover
                open={isPanelOpen}
                onClose={() => setIsPanelOpen(false)}
                trigger={avatarRef}
                placement="bottom-end"
              >
                {panelContent ?? (
                  <UserMenuPanel title="User Menu">
                    <UserMenuItem onClick={onProfileClick}>Profile</UserMenuItem>
                    <UserMenuItem onClick={onSettingsClick}>Settings</UserMenuItem>
                    <UserMenuSeparator />
                    <UserMenuItem variant="danger" onClick={onSignOutClick}>
                      Sign Out
                    </UserMenuItem>
                  </UserMenuPanel>
                )}
              </Popover>
            </div>
          </div>
        </div>
      </>
    );
  }
);

TopNav.displayName = 'TopNav';
