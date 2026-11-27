import { FileUpload as ArkFileUpload } from '@ark-ui/react/file-upload'
import { X } from 'lucide-react'

import { Text } from '@/components/primitives/text'

type FileUploadProps = {
  accept?: Record<string, string[]> | undefined
  multiple?: boolean | undefined
  onFilesChange?: ((files: File[]) => void) | undefined
  label?: string | undefined
}

/** Ark owns the dropzone, the hidden input and the accept/size filtering; the plate and the file list are ours. */
export function FileUpload({ accept, multiple, onFilesChange, label }: FileUploadProps) {
  const accepted = Object.keys(accept ?? {}).join(', ')

  return (
    <ArkFileUpload.Root
      accept={accept}
      maxFiles={multiple === true ? undefined : 1}
      onFileChange={(details) => {
        onFilesChange?.(details.acceptedFiles)
      }}
      className="space-y-2"
    >
      <ArkFileUpload.Dropzone className="border-border bg-surface-sunken hover:border-accent flex flex-col items-center justify-center gap-1 rounded border border-dashed px-4 py-6 text-center transition-colors">
        <Text as="span" tone="muted">
          {label ?? 'Drop a file here, or click to choose one'}
        </Text>
        {accepted === '' ? null : (
          <Text as="span" tone="caption">
            {accepted}
          </Text>
        )}
      </ArkFileUpload.Dropzone>
      <ArkFileUpload.Context>
        {(upload) =>
          upload.acceptedFiles.length === 0 ? null : (
            <ArkFileUpload.ItemGroup className="space-y-1">
              {upload.acceptedFiles.map((file) => (
                <ArkFileUpload.Item
                  key={`${file.name}-${String(file.size)}`}
                  file={file}
                  className="border-border bg-surface flex items-center justify-between gap-2 rounded border px-2 py-1"
                >
                  <ArkFileUpload.ItemName className="text-text truncate text-sm" />
                  <ArkFileUpload.ItemDeleteTrigger className="text-ink-400 hover:text-danger leading-none">
                    <X className="size-3" aria-hidden="true" strokeWidth={1.75} />
                  </ArkFileUpload.ItemDeleteTrigger>
                </ArkFileUpload.Item>
              ))}
            </ArkFileUpload.ItemGroup>
          )
        }
      </ArkFileUpload.Context>
      <ArkFileUpload.HiddenInput />
    </ArkFileUpload.Root>
  )
}
