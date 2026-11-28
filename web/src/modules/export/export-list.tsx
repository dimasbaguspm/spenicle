import { buttonStyles } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'
import { absent } from '@/lib/text'

import { exportRow, type ExportLike } from './row'

/**
 * Every job this instance has queued, one line each: what it is, the window it covers, how big
 * the file came out, and the link that saves it.
 */
export function ExportList({
  jobs,
  onDownload,
}: {
  jobs: readonly ExportLike[]
  onDownload: (job: ExportLike) => void
}) {
  return (
    <ul className="divide-border divide-y">
      {jobs.map((job) => {
        const row = exportRow(job)
        const caption = [row.window, row.size, row.when]
          .filter((part) => part !== absent)
          .join(' - ')

        return (
          <li key={row.ref} className="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
            <span className="min-w-0 space-y-0.5">
              <span className="text-text block truncate text-sm">{row.label}</span>
              <Text as="span" tone="caption" className="text-text-faint block">
                {caption}
              </Text>
              {row.error === undefined || row.error === '' ? null : (
                <Text as="span" tone="caption" className="text-danger block">
                  {row.error}
                </Text>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span
                className={cn(
                  'inline-block rounded-full border border-current px-2 py-0.5 text-[0.6875rem] uppercase',
                  row.tone,
                )}
              >
                {row.status}
              </span>
              {row.downloadable ? (
                <button
                  type="button"
                  className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
                  onClick={() => {
                    onDownload(job)
                  }}
                >
                  Download
                </button>
              ) : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
