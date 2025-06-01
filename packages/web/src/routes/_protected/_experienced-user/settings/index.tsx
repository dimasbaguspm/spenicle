import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  User,
  Shield,
  Bell,
  CreditCard,
  Settings,
  HelpCircle,
  FileText,
  Download,
  ChevronRight,
  LogOut,
  Tags,
} from 'lucide-react';

import { PageLayout, Tile } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/')({
  component: AccountIndexComponent,
});

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'warning' | 'danger';
}

function AccountIndexComponent() {
  const navigate = useNavigate();

  const handleNavigation = (href: string) => {
    // Navigate to the actual route
    void navigate({ to: href });
  };

  const handleSignOut = () => {
    // Handle sign out logic
    alert('Sign out functionality - not implemented yet');
  };

  const settingsSections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'Profile Information',
      description: 'Update your personal details and profile photo',
      icon: <User className="w-5 h-5" />,
      href: '/settings/profile',
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      description: 'Manage passwords, 2FA, and privacy settings',
      icon: <Shield className="w-5 h-5" />,
      href: '/settings/security',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Control how you receive alerts and updates',
      icon: <Bell className="w-5 h-5" />,
      href: '/settings/notifications',
    },
    {
      id: 'payment',
      title: 'Accounts',
      description: 'Manage your cards, banks, and payment preferences',
      icon: <CreditCard className="w-5 h-5" />,
      href: '/settings/accounts',
    },
    {
      id: 'categories',
      title: 'Categories',
      description: 'Manage transaction categories and organize your spending',
      icon: <Tags className="w-5 h-5" />,
      href: '/settings/categories',
    },
    {
      id: 'preferences',
      title: 'App Preferences',
      description: 'Customize themes, language, and app behavior',
      icon: <Settings className="w-5 h-5" />,
      href: '/settings/preferences',
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help, contact support, and view tutorials',
      icon: <HelpCircle className="w-5 h-5" />,
      href: '/settings/help',
    },
    {
      id: 'legal',
      title: 'Legal & Privacy',
      description: 'Terms of service, privacy policy, and legal documents',
      icon: <FileText className="w-5 h-5" />,
      href: '/settings/legal',
    },
    {
      id: 'data',
      title: 'Data & Export',
      description: 'Download your data and manage account data',
      icon: <Download className="w-5 h-5" />,
      href: '/settings/data-export',
    },
  ];

  const accountActions: SettingsSection[] = [
    {
      id: 'signout',
      title: 'Sign Out',
      description: 'Sign out of your account',
      icon: <LogOut className="w-5 h-5" />,
      onClick: handleSignOut,
      variant: 'danger',
    },
  ];

  return (
    <PageLayout background="cream" title="Settings" showBackButton={true}>
      <div className="space-y-6">
        {/* Settings Sections */}
        <Tile>
          <div className="divide-y divide-mist-100">
            {settingsSections.map((section) => (
              <SettingsItem
                key={section.id}
                section={section}
                onClick={() => section.href && handleNavigation(section.href)}
              />
            ))}
          </div>
        </Tile>

        {/* Account Actions */}
        <Tile>
          <div className="divide-y divide-mist-100">
            {accountActions.map((action) => (
              <SettingsItem key={action.id} section={action} onClick={action.onClick} />
            ))}
          </div>
        </Tile>
      </div>
    </PageLayout>
  );
}

interface SettingsItemProps {
  section: SettingsSection;
  onClick?: () => void;
  isLast?: boolean;
}

function SettingsItem({ section, onClick }: SettingsItemProps) {
  const getTextColor = () => {
    switch (section.variant) {
      case 'warning':
        return 'text-warning-600';
      case 'danger':
        return 'text-danger-600';
      default:
        return 'text-slate-900';
    }
  };

  const getHoverColor = () => {
    switch (section.variant) {
      case 'warning':
        return 'hover:bg-warning-50';
      case 'danger':
        return 'hover:bg-danger-50';
      default:
        return 'hover:bg-mist-50';
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-4 flex items-center gap-4 text-left transition-colors ${getHoverColor()} focus:outline-none focus:bg-mist-50 active:bg-mist-100`}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 ${getTextColor()}`}>{section.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium ${getTextColor()}`}>{section.title}</h3>
        <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
      </div>

      {/* Chevron */}
      {section.href && (
        <div className="flex-shrink-0">
          <ChevronRight className="w-5 h-5 text-mist-400" />
        </div>
      )}
    </button>
  );
}
