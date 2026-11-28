import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'

import { hasToken } from '@/api/token'
import { CapturesPage } from '@/routes/captures'
import { LedgerPage } from '@/routes/ledger'
import { LoginPage } from '@/routes/login'
import { SetupPage } from '@/routes/setup'
import { AppShell } from '@/components/layouts/app-shell'

/** The two screens a visitor without a credential is allowed to see. */
const openPaths = new Set(['/', '/setup'])

const rootRoute = createRootRoute({
  component: AppShell,
  beforeLoad: ({ location }) => {
    // the guard lives in the router, not in each screen
    if (!hasToken() && !openPaths.has(location.pathname)) {
      throw redirect({ to: '/' })
    }
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LoginPage,
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupPage,
})

const ledgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger',
  component: LedgerPage,
})

const capturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/captures',
  component: CapturesPage,
})

export const routeTree = rootRoute.addChildren([loginRoute, setupRoute, ledgerRoute, capturesRoute])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- module augmentation is always an interface
  interface Register {
    router: typeof router
  }
}
