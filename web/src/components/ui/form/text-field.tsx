import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { TextInput } from '@/components/primitives/text-input'

type TextFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  placeholder?: string | undefined
  autoComplete?: string | undefined
  disabled?: boolean | undefined
}

/**
 * A `*Field` is the join between three things nobody should have to wire twice: the form it
 * reads through `useFormProvider`, the `Field` that carries the label and the message, and the
 * input that owns the widget. It takes a `name`, never a value or an onChange.
 */
export function TextField<Schema extends FieldValues>({
  name,
  label,
  placeholder,
  autoComplete,
  disabled,
}: TextFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <TextInput
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
