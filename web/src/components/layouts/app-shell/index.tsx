import { useRouterState } from '@tanstack/react-router'

import { PrivateShell } from '@/components/layouts/private-shell'
import { PublicShell } from '@/components/layouts/public-shell'
import { hasToken } from '@/api/token'

/** The two screens a visitor without a credential is allowed to see. */
const openPaths = new Set(['/', '/setup'])

/**
 * Two shells, one switch: a signed-out visitor gets the claim or sign-in plate and nothing else,
 * a signed-in one gets the chrome. The route tree is the same either way.
 */
export function AppShell() {
  const path = useRouterState({ select: (state) => state.location.pathname })
  const signedIn = hasToken() && !openPaths.has(path)

  return signedIn ? <PrivateShell /> : <PublicShell />
}
