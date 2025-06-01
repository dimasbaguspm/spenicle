import { createFileRoute, Outlet } from '@tanstack/react-router';

import { requireAuth } from '../../hooks';
import { SessionGuard } from '../../modules/auth-module';

export const Route = createFileRoute('/_protected')({
  component: RouteComponent,
  beforeLoad: () => {
    requireAuth('/login');
  },
});

function RouteComponent() {
  return (
    <SessionGuard>
      <Outlet />
    </SessionGuard>
  );
}
