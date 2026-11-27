import { Marquee as ArkMarquee } from '@ark-ui/react/marquee'
import type { ReactNode } from 'react'

type MarqueeProps = {
  children: ReactNode
  /** scroll speed in pixels per second */
  speed?: number | undefined
}

/**
 * Ark owns the animation, the duplicated content passes and the pause on hover; we own
 * the clipped band. `autoFill` is on so the copies always cover the viewport width.
 */
export function Marquee({ children, speed }: MarqueeProps) {
  return (
    <ArkMarquee.Root
      speed={speed}
      autoFill
      className="border-border bg-surface-sunken overflow-hidden rounded-md border py-2"
    >
      <ArkMarquee.Viewport>
        <ArkMarquee.Content className="text-text-muted text-sm">{children}</ArkMarquee.Content>
      </ArkMarquee.Viewport>
    </ArkMarquee.Root>
  )
}
