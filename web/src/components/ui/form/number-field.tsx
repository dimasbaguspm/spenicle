import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/ui/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { NumberInput } from '@/components/ui/number-input'

type NumberFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
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
  hint,
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
        <Field label={label} hint={hint} error={fieldState.error?.message}>
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
