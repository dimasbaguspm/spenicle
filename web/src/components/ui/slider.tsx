import { Slider as ArkSlider } from '@ark-ui/react/slider'

type SliderProps = {
  value: number[]
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  markers?: number[] | undefined
  onValueChange: (value: number[]) => void
}

/** Ark owns the drag, the keyboard steps and one thumb per value; the rail and brass range are ours. */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  markers,
  onValueChange,
}: SliderProps) {
  return (
    <ArkSlider.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
      className="w-full space-y-1"
    >
      <ArkSlider.Control className="flex w-full items-center py-2">
        <ArkSlider.Track className="border-border bg-surface-sunken h-1.5 w-full rounded-full border">
          <ArkSlider.Range className="bg-accent h-full rounded-full" />
        </ArkSlider.Track>
        {value.map((thumbValue, position) => (
          <ArkSlider.Thumb
            key={thumbValue}
            index={position}
            className="border-accent bg-surface-raised focus-visible:ring-accent/40 size-4 rounded-full border-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArkSlider.HiddenInput />
          </ArkSlider.Thumb>
        ))}
      </ArkSlider.Control>
      {markers === undefined ? null : (
        <ArkSlider.MarkerGroup className="text-ink-400 flex justify-between text-xs">
          {markers.map((marker) => (
            <ArkSlider.Marker key={marker} value={marker} className="tabular-nums">
              {marker}
            </ArkSlider.Marker>
          ))}
        </ArkSlider.MarkerGroup>
      )}
    </ArkSlider.Root>
  )
}
