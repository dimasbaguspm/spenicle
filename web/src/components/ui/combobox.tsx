import { Combobox as ArkCombobox, createListCollection } from '@ark-ui/react/combobox'
import { useMemo, useState } from 'react'

import { control } from '@/components/ui/control'

type ComboboxOption = {
  label: string
  value: string
}

type ComboboxProps = {
  items: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string | undefined
  emptyText?: string | undefined
}

/** Ark owns the listbox semantics, the typeahead and the aria wiring; the filter and the plate are ours. */
export function Combobox({ items, value, onValueChange, placeholder, emptyText }: ComboboxProps) {
  const [inputValue, setInputValue] = useState('')
  const collection = useMemo(() => {
    const needle = inputValue.trim().toLowerCase()
    const matched =
      needle === '' ? items : items.filter((item) => item.label.toLowerCase().includes(needle))

    return createListCollection({ items: matched })
  }, [items, inputValue])
  const selected = useMemo(() => (value === '' ? [] : [value]), [value])
  return (
    <ArkCombobox.Root
      collection={collection}
      value={selected}
      onValueChange={(details) => {
        onValueChange(details.value[0] ?? '')
      }}
      onInputValueChange={(details) => {
        setInputValue(details.inputValue)
      }}
      className="w-full"
    >
      <ArkCombobox.Control className="relative flex items-center">
        <ArkCombobox.Input placeholder={placeholder} className={control()} />
        <ArkCombobox.Trigger className="text-brass-500 absolute right-2 text-xs">
          ▾
        </ArkCombobox.Trigger>
      </ArkCombobox.Control>
      <ArkCombobox.Positioner>
        <ArkCombobox.Content className="border-border-strong bg-surface-raised z-20 mt-1 max-h-64 overflow-auto rounded border p-1 text-sm shadow-xl">
          <ArkCombobox.Empty className="text-ink-400 px-2 py-1.5 text-xs">
            {emptyText ?? 'nothing found'}
          </ArkCombobox.Empty>
          {collection.items.map((item) => (
            <ArkCombobox.Item
              key={item.value}
              item={item}
              className="data-highlighted:bg-brass-800/40 data-highlighted:text-porcelain-50 cursor-pointer rounded px-2 py-1.5"
            >
              <ArkCombobox.ItemText>{item.label}</ArkCombobox.ItemText>
            </ArkCombobox.Item>
          ))}
        </ArkCombobox.Content>
      </ArkCombobox.Positioner>
    </ArkCombobox.Root>
  )
}
