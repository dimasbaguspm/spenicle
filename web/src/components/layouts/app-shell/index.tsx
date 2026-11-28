import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { queryClient } from '@/api/query'
import { clearToken, hasToken } from '@/api/token'
import { Brand } from '@/components/layouts/brand'
import { Button } from '@/components/primitives/button'
import { Menu } from '@/components/primitives/menu'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'

/** The route bar: one entry per screen, in the order the work happens. */
export const sections = [
  { to: '/dashboard', label: 'Overview' },
  { to: '/ledger', label: 'Register' },
  { to: '/accounts', label: 'Accounts' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/captures', label: 'Captures' },
] as const

const tab = 'relative shrink-0 py-3 text-sm text-ink-400 transition-colors hover:text-porcelain-100'

const activeTab =
  'text-porcelain-50 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brass-500'

export function AppShell() {
  const navigate = useNavigate()
  const path = useRouterState({ select: (state) => state.location.pathname })
  const signedIn = hasToken() && path !== '/' && path !== '/setup'

  const signOut = useCallback(() => {
    clearToken()
    queryClient.clear()
    void navigate({ to: '/' })
  }, [navigate])

  const sessionActions = useMemo(() => [{ label: 'Sign out', onSelect: signOut }], [signOut])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#content"
        className="focus:bg-ink-900 focus:text-porcelain-50 focus:ring-brass-500 sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:px-4 focus:py-2 focus:text-sm focus:ring-1"
      >
        Skip to content
      </a>

      {signedIn ? (
        <>
          <header className="border-ink-800 bg-ink-950/90 sticky top-0 z-30 border-b backdrop-blur-sm">
            <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-5 sm:px-8">
              <Link to="/dashboard" className="shrink-0 rounded focus-visible:outline-offset-4">
                <Brand size="sm" />
              </Link>
              <div className="ml-auto flex items-center gap-2">
                <Menu
                  trigger={
                    <Button tone="ghost" size="sm" className="gap-1.5" aria-label="Session menu">
                      <span>Session</span>
                      <ChevronDown className="size-3" aria-hidden="true" strokeWidth={1.75} />
                    </Button>
                  }
                  items={sessionActions}
                />
              </div>
            </div>
          </header>

          <div className="border-ink-800/70 bg-ink-950/90 sticky top-14 z-20 border-b backdrop-blur-sm">
            <nav
              className="tab-strip mx-auto -mb-px flex w-full max-w-5xl items-center gap-5 overflow-x-auto px-5 sm:gap-6 sm:px-8"
              aria-label="Sections"
            >
              {sections.map((section) => (
                <Link
                  key={section.to}
                  to={section.to}
                  className={tab}
                  activeProps={{ className: activeTab }}
                >
                  {section.label}
                </Link>
              ))}
              <Link
                to="/settings"
                className={cn(tab, 'sm:ml-auto')}
                activeProps={{ className: activeTab }}
              >
                Settings
              </Link>
            </nav>
          </div>
        </>
      ) : null}

      <main
        id="content"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-8 sm:px-8 sm:py-10"
      >
        <Outlet />
      </main>

      <footer className="border-ink-800/60 border-t">
        <div className="mx-auto w-full max-w-5xl px-5 py-6 sm:px-8">
          <Text as="span" tone="caption" className="text-ink-500 font-mono text-[0.6875rem]">
            Spenicle — self-hosted, one household, no telemetry.
          </Text>
        </div>
      </footer>
    </div>
  )
}
