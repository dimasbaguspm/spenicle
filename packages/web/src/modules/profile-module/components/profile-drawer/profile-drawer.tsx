import { useNavigate } from '@tanstack/react-router';
import { User, LogOut, Shield, BrushCleaning, File } from 'lucide-react';
import { type FC } from 'react';

import { Drawer, Avatar, Button } from '../../../../components';
import { useAppVersion } from '../../../../hooks/use-app-version';
import { useSession } from '../../../../hooks/use-session';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';

export const ProfileDrawer: FC = () => {
  const { closeDrawer } = useDrawerRouterProvider();
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
    <Drawer onClose={closeDrawer} size="sm" position="left">
      <Drawer.Content>
        <div className="flex items-center gap-4 pb-6 border-b border-mist-200">
          <Avatar size="lg" fallback={user?.name} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">{user?.name ?? 'User'}</h3>
            <p className="text-sm text-slate-500 truncate">{user?.email ?? 'user@example.com'}</p>
          </div>
        </div>
        <div className="pt-4">
          {/* User Profile Section */}

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
                  <p className="font-medium text-slate-900">{action.label}</p>
                  <p className="text-sm text-slate-500">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Drawer.Content>
      <Drawer.Footer>
        <div className="flex justify-between items-center w-full">
          <div className="px-6 py-4 text-sm text-slate-500">
            <p>{formattedVersion}</p>
          </div>
          <Button variant="error-ghost" onClick={handleLogout} iconLeft={<LogOut className="w-5 h-5" />}>
            Sign Out
          </Button>
        </div>
      </Drawer.Footer>
    </Drawer>
  );
};
