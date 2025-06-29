import { useLocation, useRouter } from '@tanstack/react-router';
import { ChartArea, Tags, Wallet2 } from 'lucide-react';
import type { FC } from 'react';

import { Avatar, Brand, IconButton, TopBar } from '../../../../components';

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
    <TopBar
      logo={<Brand size="sm" subtitle="" onClick={() => navigateTo('/')} />}
      className="mb-6"
      actions={
        <>
          <IconButton
            variant={pathname.startsWith('/analytics') ? 'coral-outline' : 'mist-outline'}
            size="sm"
            onClick={() => navigateTo('/analytics')}
          >
            <ChartArea className="size-4" />
          </IconButton>
          <IconButton
            variant={pathname.startsWith('/accounts') ? 'coral-outline' : 'mist-outline'}
            size="sm"
            onClick={() => navigateTo('/accounts')}
          >
            <Wallet2 className="size-4" />
          </IconButton>

          <IconButton
            variant={pathname.startsWith('/categories') ? 'coral-outline' : 'mist-outline'}
            size="sm"
            onClick={() => navigateTo('/categories')}
          >
            <Tags className="size-4" />
          </IconButton>
        </>
      }
      avatar={<Avatar fallback="DM" size="sm" onClick={onAvatarClick} />}
    />
  );
};
