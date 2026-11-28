import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Editable } from '@/components/primitives/editable'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type EditableFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label?: string | undefined
}

/** The form-bound editable: the value lives in the form, the primitive owns the edit state. */
export function EditableField<Schema extends FieldValues>({
  name,
  label,
}: EditableFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Editable
          value={field.value === undefined || field.value === null ? '' : String(field.value)}
          label={label}
          plain
          onValueChange={(next) => {
            field.onChange(next)
          }}
        />
      )}
    />
  )
}

/**
 * The same control outside a form: a value and the callback that persists it. A register row has
 * no form around it, and it should not have to grow one to rename a note.
 */
export function InlineEdit({
  value,
  onSave,
  empty = 'add a note',
}: {
  value: string
  onSave: (next: string) => void
  empty?: string | undefined
}) {
  return (
    <Editable
      plain
      value={value === '' ? empty : value}
      onValueChange={(next) => {
        if (next !== value && next !== empty) {
          onSave(next)
        }
      }}
    />
  )
}
