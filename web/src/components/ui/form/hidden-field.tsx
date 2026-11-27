import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { HiddenInput } from '@/components/primitives/hidden-input'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type HiddenFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  /** the literal to submit; omit it and the form's own value is what goes on the wire */
  value?: string | undefined
}

/**
 * The form-bound sibling of `HiddenInput`: a hidden input is written by the form, never typed
 * into, so it carries no label and no `Field` — only the name it registers and the value it posts.
 */
export function HiddenField<Schema extends FieldValues>({ name, value }: HiddenFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <HiddenInput
          name={field.name}
          value={value === undefined ? field.value : value}
          onChange={field.onChange}
        />
      )}
    />
  )
}
