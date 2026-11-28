import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'

import { hasToken } from '@/api/token'
import { entrySearch } from '@/modules'
import { AppShell } from '@/components/layouts/app-shell'
import { AccountDetailPage } from '@/routes/account-detail'
import { AccountEditPage, CategoryEditPage } from '@/routes/account-edit'
import { NewAccountPage, NewCategoryPage } from '@/routes/account-new'
import { AccountsPage, CategoriesPage } from '@/routes/accounts'
import { AnalyticsPage } from '@/routes/analytics'
import { CapturesPage } from '@/routes/captures'
import { CaptureReviewPage } from '@/routes/capture-detail'
import { CategoryDetailPage } from '@/routes/category-detail'
import { DashboardPage } from '@/routes/dashboard'
import { EntryDetailPage } from '@/routes/entry-detail'
import { EntryEditPage } from '@/routes/entry-edit'
import { ExportsPage } from '@/routes/exports'
import { LedgerPage } from '@/routes/ledger'
import { ManagePage } from '@/routes/manage'
import { NewEntryPage } from '@/routes/ledger-new'
import { LoginPage } from '@/routes/login'
import { PayeeDetailPage } from '@/routes/payee-detail'
import { PayeeEditPage } from '@/routes/payee-edit'
import { NewPayeePage } from '@/routes/payee-new'
import { PayeesPage } from '@/routes/payees'
import { RatesPage } from '@/routes/rates'
import { SettingsPage } from '@/routes/settings'
import { AppearancePage } from '@/routes/settings-appearance'
import { PasswordPage } from '@/routes/settings-password'
import { TokensPage } from '@/routes/settings-tokens'
import { SetupPage } from '@/routes/setup'

/** The two screens a visitor without a credential is allowed to see. */
const openPaths = new Set(['/', '/setup'])

const rootRoute = createRootRoute({
  component: AppShell,
  beforeLoad: ({ location }) => {
    // the guard lives in the router, not in each screen
    if (!hasToken() && !openPaths.has(location.pathname)) {
      throw redirect({ to: '/' })
    }

    // a credential already in hand has nothing to do on the sign-in screen
    if (hasToken() && location.pathname === '/') {
      throw redirect({ to: '/dashboard' })
    }
  },
})

// one declaration per route, so a path with params does not loosen the type of every other link
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: LoginPage })

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
})

const manageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage',
  component: ManagePage,
})

const ledgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger',
  validateSearch: entrySearch,
  component: LedgerPage,
})

const newEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger/new',
  validateSearch: (raw: Record<string, unknown>) => ({
    mode: raw.mode === 'scan' ? ('scan' as const) : ('manual' as const),
  }),
  component: NewEntryPage,
})

const entryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger/$ref',
  component: EntryDetailPage,
})

const entryEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ledger/$ref/edit',
  component: EntryEditPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/accounts',
  component: AccountsPage,
})

const newAccountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/accounts/new',
  component: NewAccountPage,
})

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/accounts/$ref',
  validateSearch: entrySearch,
  component: AccountDetailPage,
})

const accountEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/accounts/$ref/edit',
  component: AccountEditPage,
})

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/categories',
  component: CategoriesPage,
})

const newCategoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/categories/new',
  component: NewCategoryPage,
})

const categoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/categories/$ref',
  validateSearch: entrySearch,
  component: CategoryDetailPage,
})

const categoryEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/categories/$ref/edit',
  component: CategoryEditPage,
})

const payeesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/payees',
  component: PayeesPage,
})

const newPayeeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/payees/new',
  component: NewPayeePage,
})

const payeeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/payees/$ref',
  validateSearch: entrySearch,
  component: PayeeDetailPage,
})

const payeeEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/payees/$ref/edit',
  component: PayeeEditPage,
})

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsPage,
})

const capturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/captures',
  component: CapturesPage,
})

const captureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/captures/$ref',
  component: CaptureReviewPage,
})

const ratesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/rates',
  component: RatesPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const settingsAppearanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/appearance',
  component: AppearancePage,
})

const settingsPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/password',
  component: PasswordPage,
})

const settingsTokensRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/tokens',
  component: TokensPage,
})

const exportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/manage/exports',
  component: ExportsPage,
})

export const routeTree = rootRoute.addChildren([
  loginRoute,
  setupRoute,
  dashboardRoute,
  manageRoute,
  ledgerRoute,
  newEntryRoute,
  entryRoute,
  entryEditRoute,
  accountsRoute,
  newAccountRoute,
  accountRoute,
  accountEditRoute,
  categoriesRoute,
  newCategoryRoute,
  categoryRoute,
  categoryEditRoute,
  payeesRoute,
  newPayeeRoute,
  payeeRoute,
  payeeEditRoute,
  analyticsRoute,
  capturesRoute,
  captureRoute,
  exportsRoute,
  ratesRoute,
  settingsRoute,
  settingsAppearanceRoute,
  settingsPasswordRoute,
  settingsTokensRoute,
])

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- module augmentation is always an interface
  interface Register {
    router: typeof router
  }
}
