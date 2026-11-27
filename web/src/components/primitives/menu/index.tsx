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
        <ArkMenu.Content className="border-border-strong bg-surface-raised shadow-ink-950/60 z-50 mt-1 min-w-44 rounded border p-1 text-sm shadow-xl">
          {items.map((item) => (
            <ArkMenu.Item
              key={item.label}
              value={item.label}
              onSelect={item.onSelect}
              className="text-porcelain-200 data-highlighted:bg-brass-800/40 data-highlighted:text-porcelain-50 cursor-pointer rounded px-2 py-1.5"
            >
              <ArkMenu.ItemText>{item.label}</ArkMenu.ItemText>
            </ArkMenu.Item>
          ))}
        </ArkMenu.Content>
      </ArkMenu.Positioner>
    </ArkMenu.Root>
  )
}
