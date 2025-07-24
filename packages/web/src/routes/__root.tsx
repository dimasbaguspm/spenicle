import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { DrawerRouterProvider } from '../providers/drawer-router';
import { ModalProvider } from '../providers/modal';
import { SnackProvider } from '../providers/snack';

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <SnackProvider>
      <DrawerRouterProvider>
        <ModalProvider>
          <Outlet />
          <TanStackRouterDevtools />
          <ReactQueryDevtools buttonPosition="bottom-right" />
        </ModalProvider>
      </DrawerRouterProvider>
    </SnackProvider>
  ),
});
