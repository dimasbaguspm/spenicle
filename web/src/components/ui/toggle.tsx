import { Toggle as ArkToggle } from '@ark-ui/react/toggle'
import type { ReactNode } from 'react'

type ToggleProps = {
  pressed?: boolean | undefined
  onPressedChange?: ((pressed: boolean) => void) | undefined
  children: ReactNode
  'aria-label': string
}

/** Ark owns `aria-pressed` and the press event; the quiet plate that lights up when on is ours. */
export function Toggle({ pressed, onPressedChange, children, 'aria-label': label }: ToggleProps) {
  return (
    <ArkToggle.Root
      pressed={pressed}
      onPressedChange={onPressedChange}
      aria-label={label}
      className="border-border text-text-muted data-[state=on]:border-accent data-[state=on]:text-accent hover:border-border-strong focus-visible:ring-accent/40 inline-flex items-center justify-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      {children}
    </ArkToggle.Root>
  )
}
