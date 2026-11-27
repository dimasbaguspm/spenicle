import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { DatePicker } from '@/components/primitives/date-picker'
import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type DatePickerFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  placeholder?: string | undefined
}

/**
 * Joins the form to the calendar plate, which already crosses between `YYYY-MM-DD` and Ark's
 * `DateValue`; the form only ever sees the wire day string, including `''` for no choice.
 */
export function DatePickerField<Schema extends FieldValues>({
  name,
  label,
  hint,
  placeholder,
}: DatePickerFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <DatePicker
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            placeholder={placeholder}
            onValueChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
