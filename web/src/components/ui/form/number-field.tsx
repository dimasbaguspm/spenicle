import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { NumberInput } from '@/components/primitives/number-input'

type NumberFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  placeholder?: string | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
}

/**
 * Joins the form to Ark's stepper, which reads and writes a `string`: the form holds that string
 * (an empty one means "no number"), never a parsed value this field would have to invent.
 */
export function NumberField<Schema extends FieldValues>({
  name,
  label,
  placeholder,
  min,
  max,
  step,
}: NumberFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <NumberInput
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            onValueChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
