import { Toast as ArkToast, Toaster as ArkToaster } from '@ark-ui/react/toast'

import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toaster'

/**
 * Ark owns the queue, the per-type timers, the aria-live region and the stacking
 * transforms; we own the card. The store lives in `toaster.ts` so a screen can fire a
 * toast without rendering the region itself.
 */
export function Toaster() {
  return (
    <ArkToaster toaster={toast} label="Notifications" className="gap-3">
      {(item) => (
        <ArkToast.Root className="border-border-strong bg-surface-raised pointer-events-auto flex w-80 items-start gap-3 rounded-lg border p-4 shadow-xl">
          <div className="flex flex-1 flex-col gap-1">
            <ArkToast.Title asChild>
              <Text as="p" tone="body" className="text-porcelain-50 font-medium">
                {item.title}
              </Text>
            </ArkToast.Title>
            {item.description === undefined ? null : (
              <ArkToast.Description asChild>
                <Text as="p" tone="caption">
                  {item.description}
                </Text>
              </ArkToast.Description>
            )}
          </div>
          <ArkToast.CloseTrigger asChild>
            <button
              type="button"
              aria-label="Dismiss"
              className="text-text-muted hover:text-porcelain-50 rounded text-sm transition-colors"
            >
              ✕
            </button>
          </ArkToast.CloseTrigger>
        </ArkToast.Root>
      )}
    </ArkToaster>
  )
}
