import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { DateTimeInput } from '@/components/primitives/date-time-input'
import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type DateTimeFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  disabled?: boolean | undefined
}

/**
 * Joins the form to the native `datetime-local` input, which reads and writes the local
 * `YYYY-MM-DDTHH:mm` string as-is: no zone is added here, the caller decides what it means.
 */
export function DateTimeField<Schema extends FieldValues>({
  name,
  label,
  hint,
  disabled,
}: DateTimeFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <DateTimeInput
            name={field.name}
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            disabled={disabled}
            onChange={(event) => {
              field.onChange(event.target.value)
            }}
            onBlur={field.onBlur}
          />
        </Field>
      )}
    />
  )
}
