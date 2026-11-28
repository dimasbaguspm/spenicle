import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { RadioGroup } from '@/components/primitives/radio-group'

type RadioFieldOption = {
  label: string
  value: string
}

type RadioFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  options: RadioFieldOption[]
}

/**
 * Joins the form to the radio stack: `Field` carries the group's label and message, the options
 * stay the caller's, and the selection is one string with `''` for nothing picked.
 */
export function RadioField<Schema extends FieldValues>({
  name,
  label,
  options,
}: RadioFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <RadioGroup
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            options={options}
            onValueChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
