import { useMemo } from 'react'

import { useController, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { Slider } from '@/components/primitives/slider'

type SliderFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  markers?: number[] | undefined
}

/**
 * Joins the form to a one-thumb slider, bridging the widget's `number[]` and the single number the
 * form stores: the value is wrapped once per change, and the first thumb is unwrapped on the way back.
 */
export function SliderField<Schema extends FieldValues>({
  name,
  label,
  hint,
  min,
  max,
  step,
  markers,
}: SliderFieldProps<Schema>) {
  const form = useFormProvider<Schema>()
  const { field, fieldState } = useController({ control: form.control, name })
  const current = field.value
  const value = useMemo(() => [typeof current === 'number' ? current : 0], [current])

  return (
    <Field label={label} hint={hint} error={fieldState.error?.message}>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        markers={markers}
        onValueChange={(next) => {
          const [head] = next

          if (head === undefined) {
            return
          }

          field.onChange(head)
        }}
      />
    </Field>
  )
}
