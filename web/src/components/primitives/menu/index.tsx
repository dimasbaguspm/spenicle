import { Menu as ArkMenu } from '@ark-ui/react/menu'
import type { ReactNode } from 'react'

type MenuAction = {
  label: string
  onSelect: () => void
}

type MenuProps = {
  /** the element that opens it; it must be a single interactive node */
  trigger: ReactNode
  items: MenuAction[]
  align?: 'start' | 'end' | undefined
}

/**
 * Ark owns the roving focus, typeahead, escape and the anchored positioning; we own
 * the plate. Actions are plain callbacks, so a screen never sees Ark's context.
 */
export function Menu({ trigger, items, align = 'end' }: MenuProps) {
  return (
    <ArkMenu.Root positioning={{ placement: align === 'end' ? 'bottom-end' : 'bottom-start' }}>
      <ArkMenu.Trigger asChild>{trigger}</ArkMenu.Trigger>
      <ArkMenu.Positioner>
        <ArkMenu.Content className="border-ink-600 bg-ink-850/95 z-50 mt-1.5 min-w-48 rounded-lg border p-1 text-sm shadow-[0_18px_40px_-20px_rgba(0,0,0,0.95)] backdrop-blur">
          {items.map((item) => (
            <ArkMenu.Item
              key={item.label}
              value={item.label}
              onSelect={item.onSelect}
              className="text-ink-200 data-highlighted:bg-ink-800 data-highlighted:text-porcelain-50 flex min-h-9 cursor-pointer items-center rounded px-2.5 py-2 outline-none transition-colors"
            >
              <ArkMenu.ItemText>{item.label}</ArkMenu.ItemText>
            </ArkMenu.Item>
          ))}
        </ArkMenu.Content>
      </ArkMenu.Positioner>
    </ArkMenu.Root>
  )
}
