import { Popover as ArkPopover } from '@ark-ui/react/popover'
import type { ReactNode } from 'react'

import { Text } from '@/components/ui/text'

type PopoverProps = {
  trigger: ReactNode
  title?: string | undefined
  children: ReactNode
}

/** Ark owns focus management and the escape contract; we own the card. */
export function Popover({ trigger, title, children }: PopoverProps) {
  return (
    <ArkPopover.Root>
      <ArkPopover.Trigger asChild>{trigger}</ArkPopover.Trigger>
      <ArkPopover.Positioner>
        <ArkPopover.Content className="border-border-strong bg-surface-raised shadow-ink-950/60 z-50 w-72 rounded border p-4 shadow-xl">
          {title === undefined ? null : (
            <ArkPopover.Title asChild>
              <Text as="p" tone="title" className="mb-2 text-base">
                {title}
              </Text>
            </ArkPopover.Title>
          )}
          <div className="text-sm">{children}</div>
        </ArkPopover.Content>
      </ArkPopover.Positioner>
    </ArkPopover.Root>
  )
}
