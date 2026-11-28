import { Outlet } from '@tanstack/react-router'

import { ShellFooter } from '@/components/layouts/footer'

/**
 * The signed-out shell: the claim or sign-in plate in the middle of a wide page — `Gate` lays the
 * statement and the form out itself — the wordmark below it and the theme control beside that. No
 * nav, because there is nowhere to go from here.
 */
export function PublicShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main
        id="content"
        className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10"
      >
        <Outlet />
      </main>

      <ShellFooter width="max-w-5xl" />
    </div>
  )
}
