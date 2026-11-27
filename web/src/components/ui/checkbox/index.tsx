import { Checkbox as ArkCheckbox } from '@ark-ui/react/checkbox'
import { Check } from 'lucide-react'

import { Text } from '@/components/ui/text'

type CheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  description?: string | undefined
  disabled?: boolean | undefined
}

/** Ark owns the checked machine, the label association and the hidden input; the brass tick on cherry is ours. */
export function Checkbox({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: CheckboxProps) {
  return (
    <ArkCheckbox.Root
      checked={checked}
      onCheckedChange={(details) => {
        onCheckedChange(details.checked === true)
      }}
      disabled={disabled}
      className="flex items-start gap-3"
    >
      <ArkCheckbox.Control className="border-border bg-surface-sunken data-[state=checked]:border-primary data-[state=checked]:bg-primary mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors">
        <ArkCheckbox.Indicator className="text-brass-400">
          <Check className="size-3" aria-hidden="true" strokeWidth={1.75} />
        </ArkCheckbox.Indicator>
      </ArkCheckbox.Control>
      <span className="space-y-0.5">
        <ArkCheckbox.Label asChild>
          <Text as="span" tone="body">
            {label}
          </Text>
        </ArkCheckbox.Label>
        {description === undefined ? null : (
          <Text as="span" tone="caption" className="block">
            {description}
          </Text>
        )}
      </span>
      <ArkCheckbox.HiddenInput />
    </ArkCheckbox.Root>
  )
}
