import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { SegmentGroup } from '@/components/primitives/segment-group'

type SegmentFieldOption = {
  label: string
  value: string
}

type SegmentFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  options: SegmentFieldOption[]
}

/**
 * Joins the form to the segmented radio strip, which speaks one value at a time and reports a
 * cleared group as `''`; the form stores exactly that string, so a segment is a plain enum.
 */
export function SegmentField<Schema extends FieldValues>({
  name,
  label,
  options,
}: SegmentFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} error={fieldState.error?.message}>
          <SegmentGroup
            value={field.value === undefined || field.value === null ? '' : String(field.value)}
            options={options}
            onValueChange={(next) => {
              field.onChange(next)
            }}
          />
        </Field>
      )}
    />
  )
}
