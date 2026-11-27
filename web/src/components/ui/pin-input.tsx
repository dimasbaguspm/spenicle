import { PinInput as ArkPinInput } from '@ark-ui/react/pin-input'

type PinInputProps = {
  value: string[]
  onValueChange: (value: string[]) => void
  length?: number | undefined
}

/** Ark owns the focus hop between boxes and the paste/backspace handling; the boxes are ours. */
export function PinInput({ value, onValueChange, length = 6 }: PinInputProps) {
  const slots = Array.from({ length }, (_, position) => position)

  return (
    <ArkPinInput.Root
      value={value}
      count={length}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="flex flex-col gap-2"
    >
      <ArkPinInput.Control className="flex gap-2">
        {slots.map((slot) => (
          <ArkPinInput.Input
            key={slot}
            index={slot}
            className="border-border bg-surface text-text focus:border-accent focus:ring-accent/25 size-10 rounded border text-center text-sm outline-none transition-colors focus:ring-2"
          />
        ))}
      </ArkPinInput.Control>
      <ArkPinInput.HiddenInput />
    </ArkPinInput.Root>
  )
}
