import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Checkbox } from '@/components/primitives/checkbox'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { Text } from '@/components/primitives/text'

type CheckboxFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  disabled?: boolean | undefined
}

/**
 * Joins the form to a checkbox that already owns its label, so there is no `Field` here; the
 * message goes under it and a missing value counts as unchecked rather than being asserted.
 */
export function CheckboxField<Schema extends FieldValues>({
  name,
  label,
  hint,
  disabled,
}: CheckboxFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <Checkbox
            label={label}
            checked={field.value === true}
            disabled={disabled}
            onCheckedChange={(checked) => {
              field.onChange(checked)
            }}
            {...(fieldState.error === undefined ? { description: hint } : {})}
          />
          {fieldState.error?.message === undefined ? null : (
            <Text as="p" tone="caption" className="text-danger">
              {fieldState.error.message}
            </Text>
          )}
        </div>
      )}
    />
  )
}
