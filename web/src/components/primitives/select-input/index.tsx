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
            'border-ink-700 bg-ink-950/60 text-porcelain-100 flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3.5 text-left text-base transition-[border-color,box-shadow,background-color] duration-150 sm:text-sm',
            'shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)] hover:border-ink-600',
            'focus:border-brass-500 focus:bg-ink-950/80 focus:outline-none',
            'focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.55),0_0_0_3px_rgba(217,185,107,0.18)]',
            'data-[state=open]:border-brass-500',
            invalid === true &&
              'border-oxblood-500 focus:border-oxblood-400 focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.55),0_0_0_3px_rgba(194,85,85,0.2)]',
          )}
        >
          <ArkSelect.ValueText placeholder={placeholder} className="truncate" />
          <ArkSelect.Indicator className="text-brass-500 shrink-0">
            <ChevronDown className="size-4" aria-hidden="true" strokeWidth={1.75} />
          </ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>
      <ArkSelect.Positioner>
        <ArkSelect.Content className="border-ink-600 bg-ink-850 z-30 mt-1.5 max-h-64 overflow-auto rounded-md border p-1 text-sm shadow-[0_18px_40px_-20px_rgba(0,0,0,0.95)] backdrop-blur">
          {collection.items.map((item) => (
            <ArkSelect.Item
              key={item.value}
              item={item}
              className="text-ink-200 data-highlighted:bg-ink-800 data-highlighted:text-porcelain-50 data-[state=checked]:text-brass-300 group flex cursor-pointer items-center justify-between gap-2 rounded px-2.5 py-2"
            >
              <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
              <ArkSelect.ItemIndicator className="text-brass-400">
                <Check className="size-3.5" aria-hidden="true" strokeWidth={2.25} />
              </ArkSelect.ItemIndicator>
            </ArkSelect.Item>
          ))}
        </ArkSelect.Content>
      </ArkSelect.Positioner>
    </ArkSelect.Root>
  )
}
