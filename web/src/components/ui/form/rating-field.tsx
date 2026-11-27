import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { RatingGroup } from '@/components/primitives/rating-group'

type RatingFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  count?: number | undefined
}

/**
 * Joins the form to the star row, whose value is the clicked star count; `Field` carries the label
 * so the group is named, and a non-number in the form reads as no rating instead of a crash.
 */
export function RatingField<Schema extends FieldValues>({
  name,
  label,
  hint,
  count,
}: RatingFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} hint={hint} error={fieldState.error?.message}>
          <RatingGroup
            value={typeof field.value === 'number' ? field.value : 0}
            count={count}
            onValueChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
