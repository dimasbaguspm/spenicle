import { ToggleGroup as ArkToggleGroup } from '@ark-ui/react/toggle-group'

type ToggleGroupOption = {
  label: string
  value: string
}

type ToggleGroupProps = {
  value: string[]
  items: ToggleGroupOption[]
  onValueChange: (value: string[]) => void
  multiple?: boolean | undefined
}

/** Ark owns the roving focus and the multi-select rule; the grouped plate is ours. */
export function ToggleGroup({ value, items, onValueChange, multiple }: ToggleGroupProps) {
  return (
    <ArkToggleGroup.Root
      value={value}
      multiple={multiple}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="border-border inline-flex gap-1 rounded border p-1"
    >
      {items.map((item) => (
        <ArkToggleGroup.Item
          key={item.value}
          value={item.value}
          className="text-text-muted data-[state=on]:bg-primary-soft data-[state=on]:text-text focus-visible:ring-accent/40 cursor-pointer rounded px-3 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {item.label}
        </ArkToggleGroup.Item>
      ))}
    </ArkToggleGroup.Root>
  )
}
