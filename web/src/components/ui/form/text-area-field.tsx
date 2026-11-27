import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { TextAreaInput } from '@/components/primitives/text-area-input'

type TextAreaFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  placeholder?: string | undefined
  rows?: number | undefined
  disabled?: boolean | undefined
}

/** Joins the form to the multi-line input; `rows` is the caller's, the height default stays the widget's. */
export function TextAreaField<Schema extends FieldValues>({
  name,
  label,
  hint,
  placeholder,
  rows,
  disabled,
}: TextAreaFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <TextAreaInput
            name={field.name}
            rows={rows}
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            placeholder={placeholder}
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
