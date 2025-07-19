import { BottomBar, ButtonIcon } from '@dimasbaguspm/versaur';
import { useLocation, useRouter } from '@tanstack/react-router';
import { ChartArea, Home, Plus, Tags, Wallet2 } from 'lucide-react';
import type { FC } from 'react';

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

  return (
    <BottomBar className="sticky border-t border-neutral px-8">
      <BottomBar.Item
        onClick={() => handleNavigationClick('/')}
        icon={
          <ButtonIcon
            aria-label="Navigate to Home"
            variant={currentPath === '/' ? 'primary-ghost' : 'ghost'}
            shape="circle"
            size="md"
          >
            <Home className="h-5 w-5" />
          </ButtonIcon>
        }
      />
      <BottomBar.Item
        onClick={() => handleNavigationClick('/analytics')}
        icon={
          <ButtonIcon
            aria-label="Navigate To Analytics"
            variant={currentPath.startsWith('/analytics') ? 'primary-ghost' : 'ghost'}
            shape="circle"
            size="md"
          >
            <ChartArea className="h-5 w-5" />
          </ButtonIcon>
        }
      />
      <BottomBar.Item
        onClick={handleAddClick}
        icon={
          <ButtonIcon aria-label="Add Transaction" variant="primary" shape="circle">
            <Plus />
          </ButtonIcon>
        }
      />
      <BottomBar.Item
        onClick={() => handleNavigationClick('/accounts')}
        icon={
          <ButtonIcon
            aria-label="Navigate to Accounts"
            variant={currentPath.startsWith('/accounts') ? 'primary-ghost' : 'ghost'}
            shape="circle"
            size="md"
          >
            <Wallet2 className="h-5 w-5" />
          </ButtonIcon>
        }
      />
      <BottomBar.Item
        onClick={() => handleNavigationClick('/categories')}
        icon={
          <ButtonIcon
            aria-label="Navigate to Categories"
            variant={currentPath.startsWith('/categories') ? 'primary-ghost' : 'ghost'}
            shape="circle"
            size="md"
          >
            <Tags className="h-5 w-5" />
          </ButtonIcon>
        }
      />
    </BottomBar>
  );
};
