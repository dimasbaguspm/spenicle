import { useLocation, useRouter } from '@tanstack/react-router';
import { ChartArea, Plus, Receipt, Tags, Wallet2 } from 'lucide-react';
import type { FC } from 'react';

import { BottomBar } from '../../../../components';
import { DRAWER_IDS } from '../../../../constants/drawer-id';
import { useDrawerRouterProvider } from '../../../../providers/drawer-router';

export const MobileBottomBar: FC = () => {
  const location = useLocation();
  const router = useRouter();
  const { openDrawer } = useDrawerRouterProvider();

  const currentPath = location.pathname;

  const handleAddClick = async () => {
    await openDrawer(DRAWER_IDS.CREATE_TRANSACTION);
  };

  const handleNavigationClick = async (href: string) => {
    await router.navigate({ to: href });
  };

  const navigationItems = [
    {
      href: '/',
      icon: Receipt,
      label: 'Transactions',
      isActive: currentPath === '/',
      isLink: true,
    },
    {
      href: '/analytics',
      icon: ChartArea,
      label: 'Reports',
      isActive: currentPath.startsWith('/analytics'),
      isLink: true,
    },
    {
      href: '/add',
      icon: Plus,
      label: 'Add',
      isActive: false,
      isLink: false,
      onClick: handleAddClick,
    },
    {
      href: '/accounts',
      icon: Wallet2,
      label: 'Accounts',
      isActive: currentPath.startsWith('/accounts'),
      isLink: true,
    },
    {
      href: '/categories',
      icon: Tags,
      label: 'Categories',
      isActive: currentPath.startsWith('/categories'),
      isLink: true,
    },
  ];

  return (
    <BottomBar variant="compact">
      <BottomBar.Content>
        <div className="flex items-center justify-around w-full max-w-md mx-auto px-3 py-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;

            if (item.isLink) {
              return (
                <div key={item.href} className="flex items-center justify-center transition-all duration-200 px-1">
                  <BottomBar.IconButton
                    variant={item.isActive ? 'coral-ghost' : 'slate-ghost'}
                    size="md"
                    icon={<IconComponent className="w-5 h-5" />}
                    tooltip={item.label}
                    onClick={() => handleNavigationClick(item.href)}
                  />
                </div>
              );
            }

            return (
              <div
                key={item.href}
                className="flex items-center justify-center transition-all duration-200 px-1 relative"
              >
                <BottomBar.IconButton
                  variant="coral"
                  size="lg"
                  icon={<IconComponent className="w-6 h-6" />}
                  tooltip={item.label}
                  onClick={item.onClick}
                  className="shadow-lg hover:shadow-xl ring-2 ring-coral-200/50 transform hover:scale-105 transition-all duration-200"
                />
              </div>
            );
          })}
        </div>
      </BottomBar.Content>
    </BottomBar>
  );
};
