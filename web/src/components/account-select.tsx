import { Select, createListCollection } from '@ark-ui/react/select'
import { useMemo } from 'react'

export type AccountOption = {
  label: string
  value: string
}

type AccountSelectProps = {
  label: string
  placeholder: string
  value: string
  options: AccountOption[]
  onChange: (value: string) => void
}

/**
 * Ark UI keeps the behaviour (keyboard, typeahead, aria) and hands back an
 * unstyled tree; Tailwind does the rest. No component library owns our design.
 */
export function AccountSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
}: AccountSelectProps) {
  const collection = useMemo(() => createListCollection({ items: options }), [options])
  const selected = useMemo(() => (value === '' ? [] : [value]), [value])

  return (
    <Select.Root
      collection={collection}
      value={selected}
      onValueChange={(details) => {
        onChange(details.value[0] ?? '')
      }}
      positioning={{ sameWidth: true }}
    >
      <Select.Label className="text-xs text-neutral-500">{label}</Select.Label>
      <Select.Control>
        <Select.Trigger className="flex w-full items-center justify-between gap-2 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-left text-sm">
          <Select.ValueText placeholder={placeholder} />
          <Select.Indicator className="text-neutral-500">▾</Select.Indicator>
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content className="z-10 mt-1 max-h-64 overflow-auto rounded border border-neutral-700 bg-neutral-900 p-1 text-sm shadow-lg">
          {collection.items.map((item) => (
            <Select.Item
              key={item.value}
              item={item}
              className="cursor-pointer rounded px-2 py-1 data-highlighted:bg-neutral-800"
            >
              <Select.ItemText>{item.label}</Select.ItemText>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
