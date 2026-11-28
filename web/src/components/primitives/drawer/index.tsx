import { Drawer as ArkDrawer } from '@ark-ui/react/drawer'
import { X } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/primitives/button'

type DrawerProps = {
  label: string
  /** where it enters from: the nav is a left rail, a filter is a sheet from the bottom */
  side?: 'left' | 'bottom'
  /** the element that opens it; it must be a single interactive node */
  trigger: ReactNode
  /**
   * A click on the content closes it, which is what a nav wants. A sheet holding a form says no,
   * so a control inside it does not dismiss the work.
   */
  closeOnContentClick?: boolean
  /** fired as it opens, for a sheet that starts from a fresh copy of the current value */
  onOpen?: (() => void) | undefined
  /** a function child receives `close`, for a form whose Apply button ends in a dismissal */
  children: ReactNode | ((close: () => void) => ReactNode)
}

/**
 * Ark owns focus trapping, the scroll lock, escape and the backdrop contract; we own the paper.
 * A left rail is the nav; a bottom sheet is a filter.
 */
export function Drawer({
  label,
  side = 'left',
  trigger,
  closeOnContentClick = true,
  onOpen,
  children,
}: DrawerProps) {
  const [open, setOpen] = useState(false)
  const close = () => {
    setOpen(false)
  }
  const content = typeof children === 'function' ? children(close) : children

  return (
    <ArkDrawer.Root
      open={open}
      onOpenChange={(details) => {
        if (details.open) {
          onOpen?.()
        }

        setOpen(details.open)
      }}
    >
      <ArkDrawer.Trigger asChild>{trigger}</ArkDrawer.Trigger>
      <ArkDrawer.Backdrop className="bg-surface-sunken/80 fixed inset-0 z-40 backdrop-blur-sm" />
      <ArkDrawer.Positioner
        className={`fixed inset-0 z-50 flex ${side === 'bottom' ? 'items-end' : 'items-stretch'}`}
      >
        <ArkDrawer.Content
          className={
            side === 'bottom'
              ? 'bg-surface border-border flex max-h-[85dvh] w-full flex-col gap-4 overflow-y-auto rounded-t-xl border-t p-5 shadow-[0_-18px_40px_-24px_rgba(0,0,0,0.8)]'
              : 'bg-surface border-border overscroll-contain flex h-full w-[min(20rem,85vw)] flex-col gap-6 border-r p-5 shadow-[18px_0_40px_-24px_rgba(0,0,0,0.95)]'
          }
        >
          <div className="flex items-center justify-between">
            <ArkDrawer.Title asChild>
              <span className="font-display text-text text-xl font-semibold">{label}</span>
            </ArkDrawer.Title>
            <ArkDrawer.CloseTrigger asChild>
              <Button tone="ghost" size="sm" aria-label="Close">
                <X className="size-4" aria-hidden="true" strokeWidth={1.75} />
              </Button>
            </ArkDrawer.CloseTrigger>
          </div>
          <div
            className="flex flex-col gap-3 text-sm"
            onClick={
              closeOnContentClick
                ? () => {
                    setOpen(false)
                  }
                : undefined
            }
            role="presentation"
          >
            {content}
          </div>
        </ArkDrawer.Content>
      </ArkDrawer.Positioner>
    </ArkDrawer.Root>
  )
}
