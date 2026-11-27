import { NumberInput as ArkNumberInput } from '@ark-ui/react/number-input'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { control, type ControlSize } from '@/components/ui/control'
import { cn } from '@/lib/cn'

type NumberInputProps = {
  value: string
  onValueChange: (value: string) => void
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  placeholder?: string | undefined
  size?: ControlSize
  className?: string
}

/**
 * For quantities (days, repeats), never for money: this widget speaks `number`, and an
 * amount is a string of minor units. A ledger screen uses TextInput for amounts.
 */
export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  placeholder,
  size,
  className,
}: NumberInputProps) {
  return (
    <ArkNumberInput.Root
      value={value}
      min={min}
      max={max}
      step={step}
      onValueChange={(details) => {
        onValueChange(details.value)
      }}
    >
      <ArkNumberInput.Control className="flex items-center gap-1">
        <ArkNumberInput.Input
          placeholder={placeholder}
          className={cn(control({ size }), 'tabular-nums', className)}
        />
        <div className="flex flex-col">
          <ArkNumberInput.IncrementTrigger className="text-brass-500 hover:text-accent px-1">
            <ChevronUp className="size-3" aria-hidden="true" strokeWidth={1.75} />
          </ArkNumberInput.IncrementTrigger>
          <ArkNumberInput.DecrementTrigger className="text-brass-500 hover:text-accent px-1">
            <ChevronDown className="size-3" aria-hidden="true" strokeWidth={1.75} />
          </ArkNumberInput.DecrementTrigger>
        </div>
      </ArkNumberInput.Control>
    </ArkNumberInput.Root>
  )
}
