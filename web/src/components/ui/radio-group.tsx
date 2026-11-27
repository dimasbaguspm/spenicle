import { RadioGroup as ArkRadioGroup } from '@ark-ui/react/radio-group'

import { Text } from '@/components/ui/text'

type RadioGroupOption = {
  label: string
  value: string
}

type RadioGroupProps = {
  value: string
  options: RadioGroupOption[]
  onValueChange: (value: string) => void
}

/** Ark owns the arrow-key radio model and the hidden inputs; the cherry disc with a brass pip is ours. */
export function RadioGroup({ value, options, onValueChange }: RadioGroupProps) {
  return (
    <ArkRadioGroup.Root
      value={value}
      onValueChange={(details) => {
        onValueChange(details.value ?? '')
      }}
      className="flex flex-col gap-2"
    >
      {options.map((option) => (
        <ArkRadioGroup.Item
          key={option.value}
          value={option.value}
          className="flex cursor-pointer items-center gap-2"
        >
          <ArkRadioGroup.ItemControl className="group border-border bg-surface-sunken data-[state=checked]:border-primary data-[state=checked]:bg-primary flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors">
            <span className="bg-brass-400 hidden size-1.5 rounded-full group-data-[state=checked]:block" />
          </ArkRadioGroup.ItemControl>
          <ArkRadioGroup.ItemText asChild>
            <Text as="span" tone="body">
              {option.label}
            </Text>
          </ArkRadioGroup.ItemText>
          <ArkRadioGroup.ItemHiddenInput />
        </ArkRadioGroup.Item>
      ))}
    </ArkRadioGroup.Root>
  )
}
