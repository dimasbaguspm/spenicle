import { X } from 'lucide-react'
import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { Field } from '@/components/primitives/field'
import { SelectInput } from '@/components/primitives/select-input'
import { useFormProvider } from '@/components/ui/form/use-form-provider'

type MultiOption = {
  label: string
  value: string
}

type MultiSelectFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  options: MultiOption[]
  placeholder?: string | undefined
}

/**
 * A filter that takes more than one value: the listbox adds, a chip takes away, and the field
 * stores the comma string the API's `* list` parameters already speak. The listbox itself stays
 * empty on purpose — it is an "add one" control, not a selection.
 */
export function MultiSelectField<Schema extends FieldValues>({
  name,
  label,
  hint,
  options,
  placeholder = 'add…',
}: MultiSelectFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const stored: string = typeof field.value === 'string' ? field.value : ''
        const chosen = stored === '' ? [] : stored.split(',')
        const labelOf = (value: string) =>
          options.find((option) => option.value === value)?.label ?? value

        return (
          <Field label={label} hint={hint} error={fieldState.error?.message}>
            <div className="space-y-2">
              <SelectInput
                value=""
                options={options.filter((option) => !chosen.includes(option.value))}
                placeholder={placeholder}
                onChange={(next) => {
                  if (next === '' || chosen.includes(next)) {
                    return
                  }

                  field.onChange([...chosen, next].join(','))
                }}
              />

              {chosen.length === 0 ? null : (
                <ul className="flex flex-wrap gap-1.5">
                  {chosen.map((value) => (
                    <li key={value}>
                      <button
                        type="button"
                        className="bg-surface-sunken text-text hover:text-danger inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors"
                        onClick={() => {
                          field.onChange(chosen.filter((kept) => kept !== value).join(','))
                        }}
                      >
                        {labelOf(value)}
                        <X className="size-3" aria-hidden="true" strokeWidth={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
        )
      }}
    />
  )
}
