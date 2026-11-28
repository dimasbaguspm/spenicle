import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { PasswordInput } from '@/components/primitives/password-input'

type PasswordFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  placeholder?: string | undefined
  autoComplete?: string | undefined
  disabled?: boolean | undefined
}

/**
 * Joins the form to the password widget Ark already gave a visibility toggle: the default
 * `current-password` autofill is the sign-in case, and a new password passes its own value.
 */
export function PasswordField<Schema extends FieldValues>({
  name,
  label,
  placeholder,
  autoComplete = 'current-password',
  disabled,
}: PasswordFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <PasswordInput
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
