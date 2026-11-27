import { HoverCard as ArkHoverCard } from '@ark-ui/react/hover-card'
import type { ReactNode } from 'react'

type HoverCardProps = {
  trigger: ReactNode
  children: ReactNode
}

/** Ark owns the open/close delays and the pointer contract; we own the card. */
export function HoverCard({ trigger, children }: HoverCardProps) {
  return (
    <ArkHoverCard.Root openDelay={200} closeDelay={100}>
      <ArkHoverCard.Trigger asChild>{trigger}</ArkHoverCard.Trigger>
      <ArkHoverCard.Positioner>
        <ArkHoverCard.Content className="border-border-strong bg-surface-raised shadow-ink-950/60 z-50 max-w-72 rounded border p-3 text-sm shadow-xl">
          {children}
        </ArkHoverCard.Content>
      </ArkHoverCard.Positioner>
    </ArkHoverCard.Root>
  )
}
