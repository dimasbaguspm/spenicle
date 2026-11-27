import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { SelectInput } from '@/components/primitives/select-input'

type SelectFieldOption = {
  label: string
  value: string
}

type SelectFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  options: SelectFieldOption[]
  placeholder?: string | undefined
}

/**
 * Joins the form to the listbox, whose selection is an array of one value and its clear is an
 * empty string: both are folded back to the single string the form stores.
 */
export function SelectField<Schema extends FieldValues>({
  name,
  label,
  hint,
  options,
  placeholder,
}: SelectFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <SelectInput
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            options={options}
            placeholder={placeholder}
            onChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
