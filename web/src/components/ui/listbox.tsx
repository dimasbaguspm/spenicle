import { Listbox as ArkListbox, createListCollection } from '@ark-ui/react/listbox'
import { useMemo } from 'react'

type ListboxOption = {
  label: string
  value: string
}

type ListboxProps = {
  items: ListboxOption[]
  value: string[]
  onValueChange: (value: string[]) => void
}

/** Ark owns the roving focus, the keyboard model and `aria-multiselectable`; the rows are ours. */
export function Listbox({ items, value, onValueChange }: ListboxProps) {
  const collection = useMemo(() => createListCollection({ items }), [items])

  return (
    <ArkListbox.Root
      collection={collection}
      value={value}
      selectionMode="multiple"
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="border-border bg-surface rounded border p-1"
    >
      <ArkListbox.Content className="flex max-h-64 flex-col gap-0.5 overflow-auto outline-none">
        {collection.items.map((item) => (
          <ArkListbox.Item
            key={item.value}
            item={item}
            className="data-highlighted:bg-brass-800/40 data-highlighted:text-porcelain-50 cursor-pointer rounded px-2 py-1.5 text-sm transition-colors"
          >
            <ArkListbox.ItemText className="text-text-muted data-[state=checked]:text-porcelain-50">
              {item.label}
            </ArkListbox.ItemText>
            <ArkListbox.ItemIndicator className="text-accent text-xs">✓</ArkListbox.ItemIndicator>
          </ArkListbox.Item>
        ))}
      </ArkListbox.Content>
    </ArkListbox.Root>
  )
}
