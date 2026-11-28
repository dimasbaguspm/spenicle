import { useSyncExternalStore } from 'react'

/**
 * The one breakpoint the shell switches on, as a boolean a screen can branch on. A component that
 * only needs a CSS rule uses `BreakpointDesktop` instead; this is for a screen that must mount one
 * tree or the other, not hide half of it.
 */
const query = '(min-width: 64rem)'

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)

  return () => {
    media.removeEventListener('change', onChange)
  }
}

const snapshot = () => window.matchMedia(query).matches

export function useDesktop(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
