import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Menu as MenuIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { queryClient } from '@/api/query'
import { clearToken, hasToken } from '@/api/token'
import { Brand } from '@/components/layouts/brand'
import { Button } from '@/components/primitives/button'
import { Drawer } from '@/components/primitives/drawer'
import { Menu } from '@/components/primitives/menu'
import { Text } from '@/components/primitives/text'

/** One nav link, whether it sits in the masthead or in the mobile sheet. */
const navLink =
  'rounded-md px-3 py-2 text-sm text-ink-300 transition-colors hover:bg-ink-800/60 hover:text-porcelain-100'

const activeLink = 'bg-ink-800/70 text-porcelain-50'

export function AppShell() {
  const navigate = useNavigate()
  const path = useRouterState({ select: (state) => state.location.pathname })
  const signedIn = hasToken() && path !== '/'

  const signOut = useCallback(() => {
    clearToken()
    queryClient.clear()
    void navigate({ to: '/' })
  }, [navigate])

  const sessionActions = useMemo(() => [{ label: 'Sign out', onSelect: signOut }], [signOut])

  const nav = (
    <>
      <Link to="/ledger" className={navLink} activeProps={{ className: activeLink }}>
        Register
      </Link>
      <Link to="/captures" className={navLink} activeProps={{ className: activeLink }}>
        Captures
      </Link>
    </>
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#content"
        className="focus:bg-ink-850 focus:text-porcelain-50 focus:ring-brass-400 sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:ring-2"
      >
        Skip to content
      </a>

      {signedIn ? (
        <header className="border-ink-800/80 bg-ink-950/80 sticky top-0 z-30 border-b shadow-[inset_0_-1px_0_rgba(199,162,82,0.09)] backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-5 sm:gap-6 sm:px-8">
            <div className="sm:hidden">
              <Drawer
                label="Spenicle"
                trigger={
                  <Button tone="ghost" size="sm" aria-label="Open navigation">
                    <MenuIcon className="size-4" aria-hidden="true" strokeWidth={1.75} />
                  </Button>
                }
              >
                {nav}
                <Button tone="ghost" size="sm" className="justify-start" onClick={signOut}>
                  Sign out
                </Button>
              </Drawer>
            </div>

            <Link to="/ledger" className="shrink-0 rounded-md focus-visible:outline-offset-4">
              <Brand size="sm" />
            </Link>

            <nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Main">
              {nav}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <span
                aria-hidden="true"
                className="border-brass-700/70 bg-ink-850 text-brass-300 font-display grid size-8 place-items-center rounded-full border text-sm"
              >
                S
              </span>
              <Menu
                trigger={
                  <Button tone="ghost" size="sm" className="gap-1.5" aria-label="Session menu">
                    <span className="hidden sm:inline">Session</span>
                    <ChevronDown className="size-3" aria-hidden="true" strokeWidth={1.75} />
                  </Button>
                }
                items={sessionActions}
              />
            </div>
          </div>
        </header>
      ) : null}

      <main
        id="content"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-12"
      >
        <Outlet />
      </main>

      <footer className="border-ink-800/60 border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-baseline justify-between gap-2 px-5 py-5 sm:px-8">
          <Text as="span" tone="caption" className="text-ink-400 font-mono text-[0.6875rem]">
            Spenicle — self-hosted.
          </Text>
          <Text as="span" tone="caption" className="text-ink-500 font-mono text-[0.6875rem]">
            one household · no telemetry
          </Text>
        </div>
      </footer>
    </div>
  )
}
