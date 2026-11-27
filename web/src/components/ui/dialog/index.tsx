import { Dialog as ArkDialog } from '@ark-ui/react/dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

type DialogProps = {
  /** the element that opens the dialog; it must be a single interactive node */
  trigger: ReactNode
  title: string
  description?: string | undefined
  children: ReactNode
  footer?: ReactNode | undefined
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
}

/**
 * Ark owns the focus trap, the scroll lock, the escape/outside dismissal and the aria
 * labelling; we own the dimmed backdrop, the panel and the button row.
 */
export function Dialog({
  trigger,
  title,
  description,
  children,
  footer,
  open,
  onOpenChange,
}: DialogProps) {
  return (
    <ArkDialog.Root
      open={open}
      onOpenChange={(details) => {
        onOpenChange?.(details.open)
      }}
    >
      <ArkDialog.Trigger asChild>{trigger}</ArkDialog.Trigger>
      <ArkDialog.Backdrop className="bg-ink-950/70 fixed inset-0 z-40 backdrop-blur-sm" />
      <ArkDialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <ArkDialog.Content className="border-border-strong bg-surface-raised flex w-full max-w-md flex-col gap-4 rounded-lg border p-5 shadow-xl">
          <ArkDialog.Title asChild>
            <Text as="h2" tone="title">
              {title}
            </Text>
          </ArkDialog.Title>
          {description === undefined ? null : (
            <ArkDialog.Description asChild>
              <Text as="p" tone="muted">
                {description}
              </Text>
            </ArkDialog.Description>
          )}
          <div className="text-text text-sm">{children}</div>
          <div className="flex items-center justify-end gap-2">
            {footer}
            <ArkDialog.CloseTrigger asChild>
              <Button tone="quiet" size="sm">
                <X className="size-4" aria-hidden="true" strokeWidth={1.75} />
                Close
              </Button>
            </ArkDialog.CloseTrigger>
          </div>
        </ArkDialog.Content>
      </ArkDialog.Positioner>
    </ArkDialog.Root>
  )
}
