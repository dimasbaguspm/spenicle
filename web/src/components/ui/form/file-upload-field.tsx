import { Controller, type FieldPath, type FieldValues } from 'react-hook-form'

import { FileUpload } from '@/components/ui/file-upload'
import { useFormProvider } from '@/components/ui/form/use-form-provider'
import { Text } from '@/components/ui/text'

type FileUploadFieldProps<Schema extends FieldValues> = {
  name: FieldPath<Schema>
  label: string
  hint?: string | undefined
  accept?: Record<string, string[]> | undefined
  multiple?: boolean | undefined
}

/**
 * Joins the form to the dropzone, which owns its own label inside the plate, so the field only
 * hands over the accepted files and keeps the message underneath; the form stores a `File[]`.
 */
export function FileUploadField<Schema extends FieldValues>({
  name,
  label,
  hint,
  accept,
  multiple,
}: FileUploadFieldProps<Schema>) {
  const form = useFormProvider<Schema>()

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-1.5">
          <FileUpload
            label={label}
            accept={accept}
            multiple={multiple}
            onFilesChange={(files) => {
              field.onChange(files)
            }}
          />
          {hint === undefined || fieldState.error !== undefined ? null : (
            <Text as="p" tone="caption">
              {hint}
            </Text>
          )}
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
