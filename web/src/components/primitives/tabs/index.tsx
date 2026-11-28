import { Tabs as ArkTabs } from '@ark-ui/react/tabs'
import type { ReactNode } from 'react'

type TabItem = {
  value: string
  label: string
  content: ReactNode
}

type TabsProps = {
  value: string
  items: TabItem[]
  onValueChange: (value: string) => void
}

/** Ark owns the roving tab stop and the arrow keys; the brass underline is ours. */
export function Tabs({ value, items, onValueChange }: TabsProps) {
  return (
    <ArkTabs.Root
      value={value}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
    >
      <ArkTabs.List className="border-border flex gap-4 border-b">
        {items.map((item) => (
          <ArkTabs.Trigger
            key={item.value}
            value={item.value}
            className="text-text-muted -mb-px border-b-2 border-transparent pb-2 text-sm transition-colors data-[selected]:border-accent data-[selected]:text-text"
          >
            {item.label}
          </ArkTabs.Trigger>
        ))}
      </ArkTabs.List>
      {items.map((item) => (
        <ArkTabs.Content key={item.value} value={item.value} className="text-text pt-4 text-sm">
          {item.content}
        </ArkTabs.Content>
      ))}
    </ArkTabs.Root>
  )
}
