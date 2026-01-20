import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router";

import { AppLayout } from "@/components/app-layout";
import { lazy, Suspense } from "react";
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
import { DRAWER_ROUTES } from "@/constant/drawer-routes";
import { PAGE_HANDLES } from "@/constant/page-handles";
import { FloatingActions } from "../floating-actions";

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
              <DrawerProvider>
                <ModalProvider>
                  <BottomSheetProvider>
                    <AppLayout>
                      <Outlet />
                      <DrawerRouter />
                      <ModalRouter />
                      <BottomSheetRouter />
                      <FloatingActions />
                    </AppLayout>
                  </BottomSheetProvider>
                </ModalProvider>
              </DrawerProvider>
            ),
            children: [
              {
                path: PAGE_ROUTES.DASHBOARD,
                Component: lazy(() => import("./dashboard-page")),
                handle: {
                  floatingActionButton: [
                    {
                      label: "New Transaction",
                      link: DRAWER_ROUTES.TRANSACTION_CREATE,
                      type: PAGE_HANDLES.DRAWER,
                    },
                  ],
                },
              },
              {
                path: PAGE_ROUTES.TRANSACTIONS,
                children: [
                  {
                    index: true,
                    Component: lazy(() => import("./transactions-page")),
                  },
                  {
                    path: PAGE_ROUTES.TRANSACTIONS_DATE,
                    Component: lazy(() => import("./transactions-page")),
                    handle: {
                      floatingActionButton: [
                        {
                          label: "New Transaction",
                          link: DRAWER_ROUTES.TRANSACTION_CREATE,
                          type: PAGE_HANDLES.DRAWER,
                        },
                      ],
                    },
                  },
                ],
              },
              {
                path: PAGE_ROUTES.INSIGHTS,
                Component: lazy(() => import("./insights-page")),
                children: [
                  {
                    index: true,
                    Component: lazy(() => import("./insights-overview-page")),
                  },
                  {
                    path: PAGE_ROUTES.INSIGHTS_ACCOUNTS,
                    Component: lazy(() => import("./insights-accounts-page")),
                  },
                  {
                    path: PAGE_ROUTES.INSIGHTS_CATEGORIES,
                    Component: lazy(() => import("./insights-categories-page")),
                  },
                ],
              },
              {
                path: PAGE_ROUTES.SETTINGS,
                children: [
                  {
                    index: true,
                    Component: lazy(() => import("./settings-page")),
                  },
                  {
                    path: PAGE_ROUTES.SETTINGS_ACCOUNTS,
                    handle: {
                      floatingActionButton: [
                        {
                          label: "Add Account",
                          link: DRAWER_ROUTES.ACCOUNT_CREATE,
                          type: PAGE_HANDLES.DRAWER,
                        },
                      ],
                    },
                    Component: lazy(() => import("./settings-accounts-page")),
                  },
                  {
                    path: PAGE_ROUTES.SETTINGS_CATEGORIES,
                    handle: {
                      floatingActionButton: [
                        {
                          label: "Add Category",
                          link: DRAWER_ROUTES.CATEGORY_CREATE,
                          type: PAGE_HANDLES.DRAWER,
                        },
                      ],
                    },
                    Component: lazy(() => import("./settings-categories-page")),
                  },
                  {
                    path: PAGE_ROUTES.SETTINGS_SUBSCRIPTIONS,
                    handle: {
                      floatingActionButton: [
                        {
                          label: "Add Recurring",
                          link: DRAWER_ROUTES.TRANSACTION_RECURRING_CREATE,
                          type: PAGE_HANDLES.DRAWER,
                        },
                        {
                          label: "Add Installment",
                          link: DRAWER_ROUTES.TRANSACTION_INSTALLMENT_CREATE,
                          type: PAGE_HANDLES.DRAWER,
                        },
                      ],
                    },
                    Component: lazy(
                      () => import("./settings-subscriptions-page"),
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);

export const PageRouter = () => {
  return <RouterProvider router={router} />;
};
