import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Combobox } from '@/components/ui/combobox'
import { Field } from '@/components/ui/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type ComboboxFieldOption = {
  label: string
  value: string
}

type ComboboxFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  options: ComboboxFieldOption[]
  placeholder?: string | undefined
  emptyText?: string | undefined
}

/**
 * Joins the form to the filterable listbox: the widget's own `items` is the same `{ label, value }`
 * shape, and its single selection is stored as one string with `''` meaning "none chosen".
 */
export function ComboboxField<Schema extends FieldValues>({
  name,
  label,
  hint,
  options,
  placeholder,
  emptyText,
}: ComboboxFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <Combobox
            items={options}
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            placeholder={placeholder}
            emptyText={emptyText}
            onValueChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
