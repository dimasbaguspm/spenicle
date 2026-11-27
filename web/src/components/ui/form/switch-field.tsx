import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { SwitchInput } from '@/components/primitives/switch-input'
import { Text } from '@/components/primitives/text'

type SwitchFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
}

/**
 * Joins the form to a switch that carries its own label, so no `Field` wraps it; the message sits
 * under it and only an explicit `true` reads as on, so an unset field stays off.
 */
export function SwitchField<Schema extends FieldValues>({
  name,
  label,
  hint,
}: SwitchFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <SwitchInput
            label={label}
            checked={field.value === true}
            onCheckedChange={(checked) => {
              field.onChange(checked)
            }}
            {...(fieldState.error === undefined ? { hint } : {})}
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
