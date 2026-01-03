import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";

import { AppLayout } from "@/core/app-layout";
import { lazy, Suspense, type PropsWithChildren } from "react";
import { PAGE_ROUTES } from "@/constant/page-routes";
import { DrawerProvider } from "@/providers/drawer-provider";
import { ModalProvider } from "@/providers/modal-provider";
import { BottomSheetProvider } from "@/providers/bottom-sheet-provider";
import { DrawerRouter } from "../drawer/drawer-router";
import { ModalRouter } from "../modal/modal-router";
import { BottomSheetRouter } from "../bottom-sheet/bottom-sheet-router";
import { AuthProvider, useAuthProvider } from "@/providers/auth-provider";
import { PageLoader } from "@dimasbaguspm/versaur";
import { SessionProvider } from "@/providers/session-provider";

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuthProvider();

  if (!isAuthenticated) {
    return <Navigate to={PAGE_ROUTES.LOGIN} replace />;
  }

  return <Outlet />;
};

export const UnprotectedRoute = () => {
  const { isAuthenticated } = useAuthProvider();

  if (isAuthenticated) {
    return <Navigate to={PAGE_ROUTES.DASHBOARD} replace />;
  }

  return <Outlet />;
};

const router = createBrowserRouter([
  {
    // general layout and providers
    element: (
      <SessionProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </AuthProvider>
      </SessionProvider>
    ),
    children: [
      // unprotected routes like login, register, etc
      {
        element: <UnprotectedRoute />,
        children: [
          {
            path: PAGE_ROUTES.LOGIN,
            Component: lazy(() => import("./login-page")),
          },
        ],
      },
      // main app routes, protected by auth
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: (
              <AppLayout>
                <DrawerProvider>
                  <ModalProvider>
                    <BottomSheetProvider>
                      <Outlet />
                      <DrawerRouter />
                      <ModalRouter />
                      <BottomSheetRouter />
                    </BottomSheetProvider>
                  </ModalProvider>
                </DrawerProvider>
              </AppLayout>
            ),
            children: [
              {
                path: PAGE_ROUTES.DASHBOARD,
                Component: lazy(() => import("./dashboard-page")),
              },
            ],
          },
        ],
      },
    ],
  },
]);

export const PageRouter = (props: PropsWithChildren) => {
  return <RouterProvider router={router} />;
};
