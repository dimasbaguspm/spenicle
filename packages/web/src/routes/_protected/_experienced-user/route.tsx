import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

import { useSession, useViewport } from '../../../hooks';
import { cn } from '../../../libs/utils';
import { DesktopTopBar, MobileBottomBar } from '../../../modules/layout-module';

export const Route = createFileRoute('/_protected/_experienced-user')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useSession();
  const { isDesktop } = useViewport();

  if (user?.isOnboard === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div>
      {isDesktop && <DesktopTopBar />}
      <div className={cn(isDesktop ? 'max-w-7xl px-8 pb-8' : 'max-w-full', 'mx-auto')}>
        <Outlet />
      </div>
      {!isDesktop && <MobileBottomBar />}
    </div>
  );
}
