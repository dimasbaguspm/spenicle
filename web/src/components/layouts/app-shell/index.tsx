import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Menu as MenuIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'

import { queryClient } from '@/api/query'
import { clearToken, hasToken } from '@/api/token'
import { Button } from '@/components/primitives/button'
import { Drawer } from '@/components/primitives/drawer'
import { Menu } from '@/components/primitives/menu'
import { Text } from '@/components/primitives/text'

const linkClass = 'text-text-muted transition-colors hover:text-accent'

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
      <Link to="/ledger" className={linkClass}>
        Register
      </Link>
      <Link to="/captures" className={linkClass}>
        Captures
      </Link>
    </>
  )

  return (
    <div className="bg-surface-sunken text-text min-h-dvh">
      {signedIn ? (
        <header className="border-border bg-surface flex items-center gap-4 border-b px-4 py-3 text-sm">
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
          <Link to="/ledger">
            <Text as="span" tone="title" className="text-base tracking-wide">
              Spenicle
            </Text>
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">{nav}</nav>
          <div className="ml-auto">
            <Menu
              trigger={
                <Button tone="ghost" size="sm">
                  Session
                  <ChevronDown className="size-3" aria-hidden="true" strokeWidth={1.75} />
                </Button>
              }
              items={sessionActions}
            />
          </div>
        </header>
      ) : null}
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
