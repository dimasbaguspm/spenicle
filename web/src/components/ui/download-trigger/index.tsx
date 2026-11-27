import { DownloadTrigger as ArkDownloadTrigger } from '@ark-ui/react/download-trigger'
import type { ReactNode } from 'react'

type DownloadTriggerProps = {
  /** the bytes (or a text body) the browser saves */
  data: Blob | string
  fileName: string
  mimeType?: string | undefined
  children: ReactNode
  className?: string
}

/**
 * Ark owns the temporary anchor, the object URL and its revocation, which is the part a
 * hand-written download button always forgets. Nothing is stored on our side.
 */
export function DownloadTrigger({
  data,
  fileName,
  mimeType = 'text/csv',
  children,
  className,
}: DownloadTriggerProps) {
  return (
    <ArkDownloadTrigger
      data={data}
      fileName={fileName}
      mimeType={mimeType}
      className={className}
      type="button"
    >
      {children}
    </ArkDownloadTrigger>
  )
}
