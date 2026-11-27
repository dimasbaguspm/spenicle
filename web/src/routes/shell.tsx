import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'

import { clearToken, hasToken } from '@/api/token'
import { queryClient } from '@/api/query'

export function AppShell() {
  const navigate = useNavigate()
  const path = useRouterState({ select: (state) => state.location.pathname })
  const signedIn = hasToken()

  function signOut() {
    clearToken()
    queryClient.clear()
    void navigate({ to: '/' })
  }

  return (
    <div className="min-h-dvh bg-neutral-950 text-neutral-100">
      {signedIn && path !== '/' ? (
        <header className="flex items-center gap-4 border-b border-neutral-800 px-4 py-3 text-sm">
          <Link to="/ledger" className="font-semibold tracking-tight">
            Spenicle
          </Link>
          <Link to="/ledger" className="text-neutral-400 hover:text-neutral-100">
            Register
          </Link>
          <Link to="/captures" className="text-neutral-400 hover:text-neutral-100">
            Captures
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="ml-auto text-neutral-400 hover:text-neutral-100"
          >
            Sign out
          </button>
        </header>
      ) : null}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
