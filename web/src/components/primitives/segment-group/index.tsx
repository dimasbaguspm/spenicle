import { SegmentGroup as ArkSegmentGroup } from '@ark-ui/react/segment-group'

import { cn } from '@/lib/cn'

type SegmentOption = {
  label: string
  value: string
}

type SegmentGroupProps = {
  value: string
  options: SegmentOption[]
  onValueChange: (value: string) => void
  /** a strip that owns its row, for a phone where a two-way choice is the whole interaction */
  block?: boolean | undefined
}

/** Ark owns the radio-group keyboard model; the lacquer fill is ours. */
export function SegmentGroup({ value, options, onValueChange, block = false }: SegmentGroupProps) {
  return (
    <ArkSegmentGroup.Root
      value={value}
      onValueChange={(details) => {
        onValueChange(details.value ?? '')
      }}
      className={cn(
        'border-border inline-flex gap-1 rounded-md border p-1',
        block && 'flex w-full',
      )}
    >
      {options.map((item) => (
        <ArkSegmentGroup.Item
          key={item.value}
          value={item.value}
          className={cn(
            'text-text-muted data-[state=checked]:bg-primary-soft data-[state=checked]:text-text cursor-pointer rounded px-3 py-1 text-xs transition-colors',
            block && 'flex-1 py-2 text-center text-sm',
          )}
        >
          <ArkSegmentGroup.ItemText>{item.label}</ArkSegmentGroup.ItemText>
          <ArkSegmentGroup.ItemHiddenInput />
        </ArkSegmentGroup.Item>
      ))}
    </ArkSegmentGroup.Root>
  )
}
