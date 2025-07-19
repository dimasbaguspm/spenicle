import { Avatar, TopBar } from '@dimasbaguspm/versaur';
import { useLocation, useRouter } from '@tanstack/react-router';
import type { FC } from 'react';

import { Brand } from '../../../../components';

interface Props {
  onAvatarClick?: () => void;
}

export const DesktopTopBar: FC<Props> = (props) => {
  const { onAvatarClick } = props;
  const { pathname } = useLocation();
  const router = useRouter();

  const navigateTo = async (path: string) => {
    await router.navigate({ to: path });
  };

  return (
    <TopBar>
      <TopBar.Leading>
        <Brand size="sm" subtitle="" onClick={() => navigateTo('/')} />
        <TopBar.Nav>
          <TopBar.NavItem onClick={() => navigateTo('/analytics')} active={pathname.startsWith('/analytics')}>
            Analytics
          </TopBar.NavItem>
          <TopBar.NavItem onClick={() => navigateTo('/accounts')} active={pathname.startsWith('/accounts')}>
            Accounts
          </TopBar.NavItem>
          <TopBar.NavItem onClick={() => navigateTo('/categories')} active={pathname.startsWith('/categories')}>
            Categories
          </TopBar.NavItem>
        </TopBar.Nav>
      </TopBar.Leading>

      <TopBar.Trailing>
        <Avatar size="sm" onClick={onAvatarClick}>
          DM
        </Avatar>
      </TopBar.Trailing>
    </TopBar>
  );
};
