import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { DateInput } from '@/components/ui/date-input'
import { Field } from '@/components/ui/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type DateFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  disabled?: boolean | undefined
}

/**
 * Joins the form to the native date input: the browser hands over `YYYY-MM-DD`, which is already the
 * wire format the API speaks, so the form stores the string untouched.
 */
export function DateField<Schema extends FieldValues>({
  name,
  label,
  hint,
  disabled,
}: DateFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <DateInput
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
