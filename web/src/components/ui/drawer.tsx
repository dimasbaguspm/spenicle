import { Drawer as ArkDrawer } from '@ark-ui/react/drawer'
import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

type DrawerProps = {
  label: string
  /** the element that opens it; it must be a single interactive node */
  trigger: ReactNode
  /** anything that closes the sheet when clicked, which is what a nav wants */
  children: ReactNode
}

/**
 * Ark owns focus trapping, the scroll lock, escape and the backdrop contract; we own
 * the paper. A click on the content closes it, because the only drawer in the product
 * is navigation — a sheet that stays open over the page it navigated to is a bug.
 */
export function Drawer({ label, trigger, children }: DrawerProps) {
  const [open, setOpen] = useState(false)

  return (
    <ArkDrawer.Root
      open={open}
      onOpenChange={(details) => {
        setOpen(details.open)
      }}
    >
      <ArkDrawer.Trigger asChild>{trigger}</ArkDrawer.Trigger>
      <ArkDrawer.Backdrop className="bg-ink-950/70 fixed inset-0 z-40 backdrop-blur-sm" />
      <ArkDrawer.Positioner className="fixed inset-0 z-50 flex">
        <ArkDrawer.Content className="bg-surface border-border flex h-full w-72 flex-col gap-5 border-r p-5">
          <div className="flex items-center justify-between">
            <ArkDrawer.Title className="text-porcelain-50 font-display text-lg tracking-wide">
              {label}
            </ArkDrawer.Title>
            <ArkDrawer.CloseTrigger asChild>
              <Button tone="ghost" size="sm" aria-label="Close">
                ✕
              </Button>
            </ArkDrawer.CloseTrigger>
          </div>
          <div
            className="flex flex-col gap-3 text-sm"
            onClick={() => {
              setOpen(false)
            }}
            role="presentation"
          >
            {children}
          </div>
        </ArkDrawer.Content>
      </ArkDrawer.Positioner>
    </ArkDrawer.Root>
  )
}
