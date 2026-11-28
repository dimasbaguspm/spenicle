import { Outlet } from '@tanstack/react-router'

import { Brand } from '@/components/layouts/brand'
import { ThemeToggle } from '@/components/layouts/theme-toggle'
import { Text } from '@/components/primitives/text'

/**
 * The signed-out shell: a claim or sign-in card in the middle of the page, the wordmark above it
 * and the theme control below. No nav, because there is nowhere to go from here.
 */
export function PublicShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="content"
        className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10"
      >
        <Outlet />
      </main>

      <footer className="mx-auto flex w-full max-w-md items-center justify-between gap-4 px-4 pb-6">
        <div className="flex items-center gap-3">
          <Brand size="sm" />
          <Text as="span" tone="caption" className="text-text-faint">
            Self-hosted. One household.
          </Text>
        </div>
        <ThemeToggle />
      </footer>
    </div>
  )
}
