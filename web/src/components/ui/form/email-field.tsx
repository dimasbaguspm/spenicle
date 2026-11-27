import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { EmailInput } from '@/components/ui/email-input'
import { Field } from '@/components/ui/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type EmailFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  placeholder?: string | undefined
  autoComplete?: string | undefined
  disabled?: boolean | undefined
}

/**
 * Joins the form to the email widget, which already owns `type` and `inputMode`; the field only
 * carries the string back and forth, so the browser's own keyboard and autofill match it.
 */
export function EmailField<Schema extends FieldValues>({
  name,
  label,
  hint,
  placeholder,
  autoComplete,
  disabled,
}: EmailFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <EmailInput
            name={field.name}
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
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
