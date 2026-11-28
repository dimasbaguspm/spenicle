import { SegmentGroup as ArkSegmentGroup } from '@ark-ui/react/segment-group'

type SegmentOption = {
  label: string
  value: string
}

type SegmentGroupProps = {
  value: string
  options: SegmentOption[]
  onValueChange: (value: string) => void
}

/** Ark owns the radio-group keyboard model; the lacquer fill is ours. */
export function SegmentGroup({ value, options, onValueChange }: SegmentGroupProps) {
  return (
    <ArkSegmentGroup.Root
      value={value}
      onValueChange={(details) => {
        onValueChange(details.value ?? '')
      }}
      className="border-border inline-flex gap-1 rounded-md border p-1"
    >
      {options.map((item) => (
        <ArkSegmentGroup.Item
          key={item.value}
          value={item.value}
          className="text-text-muted data-[state=checked]:bg-primary-soft data-[state=checked]:text-text cursor-pointer rounded px-3 py-1 text-xs transition-colors"
        >
          <ArkSegmentGroup.ItemText>{item.label}</ArkSegmentGroup.ItemText>
          <ArkSegmentGroup.ItemHiddenInput />
        </ArkSegmentGroup.Item>
      ))}
    </ArkSegmentGroup.Root>
  )
}
