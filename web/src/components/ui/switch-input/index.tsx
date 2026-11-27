import { Switch as ArkSwitch } from '@ark-ui/react/switch'

import { Text } from '@/components/ui/text'

type SwitchInputProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  hint?: string | undefined
}

/** Ark owns the checkbox semantics and the hidden input; the brass pill is ours. */
export function SwitchInput({ checked, onCheckedChange, label, hint }: SwitchInputProps) {
  return (
    <ArkSwitch.Root
      checked={checked}
      onCheckedChange={(details) => {
        onCheckedChange(details.checked)
      }}
      className="flex items-start gap-3"
    >
      <ArkSwitch.Control className="bg-ink-700 data-[state=checked]:bg-primary mt-0.5 h-5 w-9 shrink-0 rounded-full p-0.5 transition-colors">
        <ArkSwitch.Thumb className="bg-porcelain-100 block size-4 rounded-full transition-transform data-[state=checked]:translate-x-4" />
      </ArkSwitch.Control>
      <span className="space-y-0.5">
        <ArkSwitch.Label asChild>
          <Text as="span" tone="body">
            {label}
          </Text>
        </ArkSwitch.Label>
        {hint === undefined ? null : (
          <Text as="span" tone="caption" className="block">
            {hint}
          </Text>
        )}
      </span>
      <ArkSwitch.HiddenInput />
    </ArkSwitch.Root>
  )
}
