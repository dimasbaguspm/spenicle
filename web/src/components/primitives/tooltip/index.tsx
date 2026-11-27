import { Tooltip as ArkTooltip } from '@ark-ui/react/tooltip'
import type { ReactNode } from 'react'

type TooltipProps = {
  content: ReactNode
  /** the element the bubble hangs off; it must be a single interactive node */
  children: ReactNode
}

/**
 * Ark owns the open/close delays, the popper positioning and the aria-describedby link;
 * we own the bubble and its brass hairline.
 */
export function Tooltip({ content, children }: TooltipProps) {
  return (
    <ArkTooltip.Root openDelay={200} closeDelay={100} positioning={{ placement: 'top' }}>
      <ArkTooltip.Trigger asChild>{children}</ArkTooltip.Trigger>
      <ArkTooltip.Positioner>
        <ArkTooltip.Content className="border-brass-700 bg-surface-raised text-text max-w-64 rounded border px-2 py-1 text-xs shadow-lg">
          {content}
        </ArkTooltip.Content>
      </ArkTooltip.Positioner>
    </ArkTooltip.Root>
  )
}
