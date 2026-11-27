import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/ui/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { PinInput } from '@/components/ui/pin-input'

const NO_DIGITS: string[] = []

type PinFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  length?: number | undefined
}

/**
 * Joins the form to the PIN boxes, which hold one string per digit; `length` sets the box count and
 * a missing form value falls back to one shared empty array instead of a new one per render.
 */
export function PinField<Schema extends FieldValues>({
  name,
  label,
  hint,
  length,
}: PinFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <PinInput
            value={Array.isArray(field.value) ? field.value : NO_DIGITS}
            length={length}
            onValueChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
