import { PageLayout } from '@dimasbaguspm/versaur/layouts';
import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';

import { useSession, useViewport } from '../../../hooks';
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
    <>
      {isDesktop && <DesktopTopBar />}
      <PageLayout type={isDesktop ? 'desktop' : 'mobile'} className="mx-auto grow-1 pb-6">
        <Outlet />
      </PageLayout>
      {!isDesktop && <MobileBottomBar />}
    </>
  );
}
