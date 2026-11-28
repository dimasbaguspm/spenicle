import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { Bootstrap } from '@/api/types'
import { Brand } from '@/components/layouts/brand'
import { Button } from '@/components/primitives/button'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useBootstrap } from '@/hooks/queries/use-bootstrap'

type AppState = {
  /** the one public read a screen may rely on: is the ledger claimed, and in what currency */
  bootstrap: Bootstrap
}

const AppContext = createContext<AppState | undefined>(undefined)

export function useApp(): AppState {
  const value = useContext(AppContext)

  if (value === undefined) {
    throw new Error('useApp is only available inside <AppProvider>')
  }

  return value
}

/**
 * The gate the whole app sits behind: `GET /api/bootstrap` is read once, before any screen
 * mounts, because it is the only answer that needs no credential and it decides between the
 * claim wizard and the sign-in screen. Nothing here reads `/api/meta`: that one wants a token,
 * and a fresh instance has none to give.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const bootstrap = useBootstrap()
  const data = bootstrap.data
  const value = useMemo(() => (data === undefined ? undefined : { bootstrap: data }), [data])

  if (value !== undefined) {
    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
  }

  return (
    <Splash
      title={bootstrap.isPending ? 'Opening the ledger' : 'This instance did not answer'}
      detail={bootstrap.error?.message}
      onRetry={
        bootstrap.isPending
          ? undefined
          : () => {
              void bootstrap.refetch()
            }
      }
    />
  )
}

function Splash({
  title,
  detail,
  onRetry,
}: {
  title: string
  detail: string | undefined
  onRetry?: (() => void) | undefined
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 py-10">
      <Brand />
      <Panel className="space-y-3 p-6 text-center">
        <Text as="p" tone="body">
          {title}
        </Text>
        {detail === undefined ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {detail}
          </Text>
        )}
        {onRetry === undefined ? null : (
          <Button tone="quiet" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Panel>
    </main>
  )
}
