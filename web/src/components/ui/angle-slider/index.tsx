import { AngleSlider as ArkAngleSlider } from '@ark-ui/react/angle-slider'

type AngleSliderProps = {
  value: number
  onValueChange: (value: number) => void
}

/** Ark owns the pointer-to-degree maths and the keyboard model; the brass dial and its readout are ours. */
export function AngleSlider({ value, onValueChange }: AngleSliderProps) {
  return (
    <ArkAngleSlider.Root
      value={value}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="flex items-center gap-3"
    >
      <ArkAngleSlider.Control className="border-border bg-surface-sunken relative size-20 rounded-full border">
        <ArkAngleSlider.Thumb className="bg-accent border-accent absolute size-3 rounded-full border" />
      </ArkAngleSlider.Control>
      <ArkAngleSlider.ValueText className="text-text font-mono text-sm" />
      <ArkAngleSlider.HiddenInput />
    </ArkAngleSlider.Root>
  )
}
