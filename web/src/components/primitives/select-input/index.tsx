import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { useMemo } from 'react'

import { cn } from '@/lib/cn'

type SelectInputOption = {
  label: string
  value: string
}

type SelectInputProps = {
  value: string
  options: SelectInputOption[]
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
 *
 * The trigger is the same plate as every input, so a form reads as one surface; the
 * menu is the raised version of that plate, with the selected row marked twice —
 * once by brass text and once by a check, because colour alone is not a state.
 */
export function SelectInput({
  value,
  options,
  placeholder = 'choose…',
  onChange,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
}: SelectInputProps) {
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
            'border-ink-700 text-porcelain-100 flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3.5 text-left text-base transition-colors duration-150 sm:text-sm',
            'hover:border-ink-600',
            'focus:border-brass-600 focus:bg-ink-950/40 focus:ring-1 focus:ring-brass-600/40 focus:outline-none',
            'data-[state=open]:border-brass-600',
            invalid === true &&
              'border-oxblood-500 focus:border-oxblood-400 focus:ring-oxblood-500/30',
          )}
        >
          <ArkSelect.ValueText placeholder={placeholder} className="truncate" />
          <ArkSelect.Indicator className="text-ink-400 shrink-0">
            <ChevronDown className="size-4" aria-hidden="true" strokeWidth={1.75} />
          </ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>
      <ArkSelect.Positioner>
        <ArkSelect.Content className="border-ink-700 bg-ink-900 z-30 mt-1.5 max-h-64 overflow-auto rounded-md border p-1 text-sm shadow-[0_16px_32px_-20px_rgba(0,0,0,0.9)]">
          {collection.items.map((item) => (
            <ArkSelect.Item
              key={item.value}
              item={item}
              className="text-ink-200 data-highlighted:bg-ink-800 data-highlighted:text-porcelain-50 group flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-2"
            >
              <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
              <ArkSelect.ItemIndicator className="text-brass-500">
                <Check className="size-3.5" aria-hidden="true" strokeWidth={2.25} />
              </ArkSelect.ItemIndicator>
            </ArkSelect.Item>
          ))}
        </ArkSelect.Content>
      </ArkSelect.Positioner>
    </ArkSelect.Root>
  )
}
