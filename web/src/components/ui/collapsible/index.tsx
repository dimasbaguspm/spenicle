import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible'
import type { ReactNode } from 'react'

type CollapsibleProps = {
  /** the element that toggles the region; it must be a single interactive node */
  trigger: ReactNode
  children: ReactNode
}

/**
 * Ark owns the measured height animation and the aria-expanded/aria-controls wiring; we
 * own the trigger slot and the clipped box the content animates inside.
 */
export function Collapsible({ trigger, children }: CollapsibleProps) {
  return (
    <ArkCollapsible.Root>
      <ArkCollapsible.Trigger asChild>{trigger}</ArkCollapsible.Trigger>
      <ArkCollapsible.Content className="text-text overflow-hidden text-sm">
        {children}
      </ArkCollapsible.Content>
    </ArkCollapsible.Root>
  )
}
