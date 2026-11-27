import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'

import { queryClient } from '@/api/query'
import { clearToken, hasToken } from '@/api/token'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Menu } from '@/components/ui/menu'

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
                  ☰
                </Button>
              }
            >
              {nav}
              <Button tone="ghost" size="sm" className="justify-start" onClick={signOut}>
                Sign out
              </Button>
            </Drawer>
          </div>
          <Link
            to="/ledger"
            className="font-display text-porcelain-50 text-base font-semibold tracking-wide"
          >
            Spenicle
          </Link>
          <nav className="hidden items-center gap-4 sm:flex">{nav}</nav>
          <div className="ml-auto">
            <Menu
              trigger={
                <Button tone="ghost" size="sm">
                  Session ▾
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
