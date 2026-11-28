import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'

import { hasToken } from '@/api/token'
import { AccountsPage } from '@/routes/accounts'
import { AnalyticsPage } from '@/routes/analytics'
import { CapturesPage } from '@/routes/captures'
import { DashboardPage } from '@/routes/dashboard'
import { LedgerPage } from '@/routes/ledger'
import { LoginPage } from '@/routes/login'
import { SettingsPage } from '@/routes/settings'
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

const routes = [
  { path: '/', component: LoginPage },
  { path: '/setup', component: SetupPage },
  { path: '/dashboard', component: DashboardPage },
  { path: '/ledger', component: LedgerPage },
  { path: '/accounts', component: AccountsPage },
  { path: '/analytics', component: AnalyticsPage },
  { path: '/captures', component: CapturesPage },
  { path: '/settings', component: SettingsPage },
] as const

const children = routes.map((entry) =>
  createRoute({ getParentRoute: () => rootRoute, path: entry.path, component: entry.component }),
)

export const routeTree = rootRoute.addChildren(children)

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- module augmentation is always an interface
  interface Register {
    router: typeof router
  }
}
