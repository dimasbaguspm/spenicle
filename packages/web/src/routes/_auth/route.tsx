import { createFileRoute, Outlet } from '@tanstack/react-router';

import { redirectIfAuthenticated } from '../../hooks';

export const Route = createFileRoute('/_auth')({
  component: RouteComponent,
  beforeLoad: () => {
    redirectIfAuthenticated('/');
  },
});

function RouteComponent() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
