import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select'
import { useMemo } from 'react'

import { cn } from '@/lib/cn'

type SelectOption = {
  label: string
  value: string
}

type SelectProps = {
  value: string
  options: SelectOption[]
  placeholder?: string | undefined
  onChange: (value: string) => void
  /** injected by Ui Field; a screen never passes these by hand */
  id?: string | undefined
  'aria-describedby'?: string | undefined
  'aria-invalid'?: boolean | undefined
}

/**
 * Ark owns the hard part — listbox semantics, typeahead, roving focus, aria — and
 * we own every pixel. This file is the only place in the app allowed to import it,
 * so a future swap (or a native `<select>` on a tiny screen) is one edit.
 */
export function Select({
  value,
  options,
  placeholder = 'choose',
  onChange,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: SelectProps) {
  const collection = useMemo(() => createListCollection({ items: options }), [options])
  const selected = useMemo(() => (value === '' ? [] : [value]), [value])

  return (
    <ArkSelect.Root
      collection={collection}
      value={selected}
      onValueChange={(details) => {
        onChange(details.value[0] ?? '')
      }}
      positioning={{ sameWidth: true }}
    >
      <ArkSelect.Control>
        <ArkSelect.Trigger
          {...(id === undefined ? {} : { id })}
          {...(describedBy === undefined ? {} : { 'aria-describedby': describedBy })}
          {...(invalid === undefined ? {} : { 'aria-invalid': invalid })}
          className={cn(
            'border-border bg-surface text-text flex w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm transition-colors',
            'hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none',
            'data-[state=open]:border-accent',
            invalid === true && 'border-danger focus:border-danger focus:ring-danger/25',
          )}
        >
          <ArkSelect.ValueText placeholder={placeholder} className="truncate" />
          <ArkSelect.Indicator className="text-brass-500 shrink-0 text-xs">▾</ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>
      <ArkSelect.Positioner>
        <ArkSelect.Content className="border-border-strong bg-surface-raised shadow-ink-950/60 z-10 mt-1 max-h-64 overflow-auto rounded border p-1 text-sm shadow-xl">
          {collection.items.map((item) => (
            <ArkSelect.Item
              key={item.value}
              item={item}
              className="text-porcelain-200 data-highlighted:bg-brass-800/40 data-highlighted:text-porcelain-50 data-[state=checked]:text-accent cursor-pointer rounded px-2 py-1.5"
            >
              <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
            </ArkSelect.Item>
          ))}
        </ArkSelect.Content>
      </ArkSelect.Positioner>
    </ArkSelect.Root>
  )
}
