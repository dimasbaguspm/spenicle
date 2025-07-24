import { Drawer } from '@dimasbaguspm/versaur/overlays';
import { Avatar, Button, Icon, Text } from '@dimasbaguspm/versaur/primitive';
import { useNavigate } from '@tanstack/react-router';
import { User, LogOut, Shield, BrushCleaning, File } from 'lucide-react';
import { type FC } from 'react';

import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useViewport } from '../../../../hooks';
import { useAppVersion } from '../../../../hooks/use-app-version';
import { useSession } from '../../../../hooks/use-session';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';

export const ProfileDrawer: FC = () => {
  const { closeDrawer, drawerId } = useDrawerRouterProvider();
  const { isDesktop } = useViewport();
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { formattedVersion } = useAppVersion();

  const handleLogout = async () => {
    await logout();
    closeDrawer();
  };

  const handleNavigation = async (path: string) => {
    await navigate({
      to: path,
    });
  };

  const profileActions = [
    {
      id: 'profile',
      label: 'Profile Information',
      description: 'Edit your personal details',
      icon: <User className="w-5 h-5" />,
      onClick: () => handleNavigation('/settings/profile'),
    },
    {
      id: 'security',
      label: 'Security & Privacy',
      description: 'Manage passwords and security',
      icon: <Shield className="w-5 h-5" />,
      onClick: () => handleNavigation('/settings/security'),
    },
    {
      id: 'preferences',
      label: 'App Preferences',
      description: 'Customize your app experience',
      icon: <BrushCleaning className="w-5 h-5" />,
      onClick: () => handleNavigation('/settings/preferences'),
    },
    {
      id: 'backup',
      label: 'Backup & Restore',
      description: 'Manage your data backups',
      icon: <File className="w-5 h-5" />,
      onClick: () => handleNavigation('/settings/backup'),
    },
  ];

  return (
    <Drawer
      isOpen={drawerId === DRAWER_IDS.PROFILE}
      onClose={closeDrawer}
      size={isDesktop ? 'md' : '3/4'}
      position="left"
    >
      <Drawer.Body>
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          <Avatar size="lg">{user?.name}</Avatar>
          <div className="flex-1 min-w-0">
            <Text as="h3" fontWeight="semibold" ellipsis clamp={2}>
              {user?.name ?? 'User'}
            </Text>
            <Text as="p" fontSize="sm" ellipsis clamp={1}>
              {user?.email ?? 'user@example.com'}
            </Text>
          </div>
        </div>
        <div className="pt-4">
          {/* Quick Actions */}
          <div className="space-y-1">
            {profileActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-mist-50 transition-colors text-left"
              >
                <div className="text-slate-600 flex-shrink-0">{action.icon}</div>
                <div className="flex-1 min-w-0">
                  <Text as="p" fontWeight="medium">
                    {action.label}
                  </Text>
                  <Text fontSize="sm" color="gray">
                    {action.description}
                  </Text>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Drawer.Body>
      <Drawer.Footer>
        <div className="flex justify-between items-center w-full">
          <Text as="p" fontSize="sm" color="neutral">
            {formattedVersion}
          </Text>
          <Button variant="danger-ghost" onClick={handleLogout}>
            <Icon as={LogOut} size="sm" className="mr-2" />
            Sign Out
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer>
  );
};
