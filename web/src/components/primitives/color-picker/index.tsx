import { ColorPicker as ArkColorPicker, parseColor } from '@ark-ui/react/color-picker'

import { Button } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'

type ColorPickerProps = {
  /** a hex string; it is also what `onValueChange` hands back */
  value: string
  onValueChange: (hex: string) => void
}

/**
 * Ark owns the saturation area, the drag maths, the popover and the eyedropper; we own the
 * swatch trigger and the panel. The machine runs in `hsla` so the area is saturation
 * against lightness, which is what a hex value actually maps onto.
 */
export function ColorPicker({ value, onValueChange }: ColorPickerProps) {
  return (
    <ArkColorPicker.Root
      format="hsla"
      value={parseColor(value)}
      onValueChange={(details) => {
        onValueChange(details.value.toString('hex'))
      }}
      className="inline-flex"
    >
      <ArkColorPicker.Trigger className="border-border-strong bg-surface-raised hover:border-brass-700 inline-flex items-center gap-2 rounded border p-1 pr-3 transition-colors">
        <ArkColorPicker.ValueSwatch className="border-border h-5 w-5 rounded-sm border" />
        <Text as="span" tone="code">
          {value}
        </Text>
      </ArkColorPicker.Trigger>
      <ArkColorPicker.Positioner>
        <ArkColorPicker.Content className="border-border-strong bg-surface-raised z-50 flex w-64 flex-col gap-3 rounded border p-3 shadow-xl">
          <ArkColorPicker.Area className="relative h-40 w-full">
            <ArkColorPicker.AreaBackground className="h-full w-full rounded" />
            <ArkColorPicker.AreaThumb className="border-porcelain-50 h-3 w-3 rounded-full border-2 shadow" />
          </ArkColorPicker.Area>
          <ArkColorPicker.EyeDropperTrigger asChild>
            <Button tone="quiet" size="sm">
              Pick from screen
            </Button>
          </ArkColorPicker.EyeDropperTrigger>
        </ArkColorPicker.Content>
      </ArkColorPicker.Positioner>
    </ArkColorPicker.Root>
  )
}
