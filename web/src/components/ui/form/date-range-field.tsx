import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { DateRangePicker } from '@/components/primitives/date-range-picker'
import { Field } from '@/components/primitives/field'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type DateRangeFieldProps<Schema extends FieldValues> = {
  /** the first day, as the query spells it */
  from: FieldPath<Schema>
  /** the last day */
  to: FieldPath<Schema>
  label: string
}

/**
 * A range is one question, so it is one field: two native date inputs under a single label, each
 * written to the name a query already carries. A form that filters on a window says `When` once.
 */
export function DateRangePickerField<Schema extends FieldValues>({
  from,
  to,
  label,
}: DateRangeFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={from}
      render={({ field: fromField }) => (
        <Controller
          control={form.control}
          name={to}
          render={({ field: toField }) => (
            <Field label={label}>
              <DateRangePicker
                from={typeof fromField.value === 'string' ? fromField.value : ''}
                to={typeof toField.value === 'string' ? toField.value : ''}
                onFromChange={(day) => {
                  fromField.onChange(day)
                }}
                onToChange={(day) => {
                  toField.onChange(day)
                }}
              />
            </Field>
          )}
        />
      )}
    />
  )
}
