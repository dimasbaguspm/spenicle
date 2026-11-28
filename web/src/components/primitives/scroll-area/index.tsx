import { ScrollArea as ArkScrollArea } from '@ark-ui/react/scroll-area'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type ScrollAreaProps = {
  children: ReactNode
  size?: 'sm' | 'md'
  orientation?: 'vertical' | 'horizontal' | 'both'
}

/** Ark owns the scrollbar state, the thumb geometry and the drag; we own the two bars' skin. */
export function ScrollArea({ children, size = 'md', orientation = 'vertical' }: ScrollAreaProps) {
  const bar = cn(
    'bg-surface-raised/80 absolute z-10 flex rounded-full',
    size === 'sm' ? 'p-0.5' : 'p-1',
  )
  const thumb = 'bg-accent/80 hover:bg-accent size-full rounded-full transition-colors'
  const wide = size === 'sm' ? 'w-2' : 'w-3'
  const tall = size === 'sm' ? 'h-2' : 'h-3'
  const showY = orientation === 'vertical' || orientation === 'both'
  const showX = orientation === 'horizontal' || orientation === 'both'
  return (
    <ArkScrollArea.Root className="border-border bg-surface-sunken relative rounded border">
      <ArkScrollArea.Viewport className="max-h-72">
        <ArkScrollArea.Content>{children}</ArkScrollArea.Content>
      </ArkScrollArea.Viewport>
      {showY ? (
        <ArkScrollArea.Scrollbar
          orientation="vertical"
          className={cn(bar, 'inset-y-1 right-1 justify-center', wide)}
        >
          <ArkScrollArea.Thumb className={thumb} />
        </ArkScrollArea.Scrollbar>
      ) : null}
      {showX ? (
        <ArkScrollArea.Scrollbar
          orientation="horizontal"
          className={cn(bar, 'inset-x-1 bottom-1 flex-col justify-center', tall)}
        >
          <ArkScrollArea.Thumb className={thumb} />
        </ArkScrollArea.Scrollbar>
      ) : null}
      {showX && showY ? (
        <ArkScrollArea.Corner
          className={cn('bg-surface-raised/80 absolute right-1 bottom-1 rounded-full', wide, tall)}
        />
      ) : null}
    </ArkScrollArea.Root>
  )
}
