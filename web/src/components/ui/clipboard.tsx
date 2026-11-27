import { Clipboard as ArkClipboard } from '@ark-ui/react/clipboard'

import { Text } from '@/components/ui/text'

type ClipboardProps = {
  value: string
  label?: string | undefined
}

/**
 * Ark owns the clipboard call, the copied timeout and the indicator swap; we own the
 * label and the trigger button.
 */
export function Clipboard({ value, label }: ClipboardProps) {
  return (
    <ArkClipboard.Root value={value} className="inline-flex items-center gap-2">
      {label === undefined ? null : (
        <ArkClipboard.Label asChild>
          <Text as="span" tone="muted">
            {label}
          </Text>
        </ArkClipboard.Label>
      )}
      <ArkClipboard.Trigger className="border-border text-text-muted hover:border-border-strong hover:text-porcelain-50 inline-flex items-center gap-1 rounded border px-3 py-1.5 text-sm transition-colors">
        <ArkClipboard.Indicator copied="Copied">Copy</ArkClipboard.Indicator>
      </ArkClipboard.Trigger>
    </ArkClipboard.Root>
  )
}
