import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { TagsInput } from '@/components/primitives/tags-input'

const NO_TAGS: string[] = []

type TagsFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  placeholder?: string | undefined
}

/**
 * Joins the form to the chip editor, whose value is a `string[]`: a missing or stale form value
 * falls back to one shared empty array, so the field never hands the widget a fresh one per render.
 */
export function TagsField<Schema extends FieldValues>({
  name,
  label,
  placeholder,
}: TagsFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <TagsInput
            value={Array.isArray(field.value) ? field.value : NO_TAGS}
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
