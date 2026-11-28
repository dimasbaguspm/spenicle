import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import { clearToken, setToken, token as storedToken } from '@/api/token'

type AuthState = {
  /** the scoped credential this tab holds, or none */
  token: string | undefined
  isAuthenticated: boolean
  /** keep the token the API just issued; the password itself is never stored */
  signIn: (credential: string) => void
  signOut: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)

  if (value === undefined) {
    throw new Error('useAuth is only available inside <AuthProvider>')
  }

  return value
}

/**
 * The browser's credential, in one place: `sessionStorage` behind `api/token.ts` is the store,
 * this is the React view of it. Only the scoped token lives here — never the instance password.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setCredential] = useState(() => storedToken())

  const signIn = useCallback((credential: string) => {
    setToken(credential)
    setCredential(credential)
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setCredential(undefined)
  }, [])

  const value = useMemo(
    () => ({ token, isAuthenticated: token !== undefined, signIn, signOut }),
    [token, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
