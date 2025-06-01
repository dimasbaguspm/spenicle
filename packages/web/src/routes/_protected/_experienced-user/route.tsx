import { createFileRoute, Navigate, Outlet, useLocation, useRouter } from '@tanstack/react-router';
import { BarChart3, Home, Plus, Receipt, Settings } from 'lucide-react';

import { BottomBar } from '../../../components';
import { DRAWER_IDS } from '../../../constants/drawer-id';
import { useSession } from '../../../hooks';
import { useDrawerRouterProvider } from '../../../providers/drawer-router';

export const Route = createFileRoute('/_protected/_experienced-user')({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();
  const router = useRouter();
  const { openDrawer } = useDrawerRouterProvider();
  const { user } = useSession();

  if (user?.isOnboard === false) {
    return <Navigate to="/onboarding" replace />;
  }

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
      icon: Home,
      label: 'Home',
      isActive: currentPath === '/',
      isLink: true,
    },
    {
      href: '/transactions',
      icon: Receipt,
      label: 'Transactions',
      isActive: currentPath === '/transactions',
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
      href: '/analytics',
      icon: BarChart3,
      label: 'Reports',
      isActive: currentPath === '/analytics',
      isLink: true,
    },
    {
      href: '/settings',
      icon: Settings,
      label: 'Settings',
      isActive: currentPath === '/settings',
      isLink: true,
    },
  ];

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      <Outlet />
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
    </div>
  );
}
