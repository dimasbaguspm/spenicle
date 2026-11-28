import { Text } from '@/components/primitives/text'

import type { TimelineRow } from './row'

/**
 * One row's life, newest first: a dot, the thing that happened, and who did it. It is the journal
 * read back, so nothing here is inferred — a reversal is a line because a reversal was written.
 */
export function EntryTimeline({ rows }: { rows: readonly TimelineRow[] }) {
  if (rows.length === 0) {
    return (
      <Text as="p" tone="muted" className="p-5 sm:p-6">
        No history yet.
      </Text>
    )
  }

  return (
    <ol className="p-5 sm:p-6">
      {rows.map((row, index) => (
        <li key={row.ref} className="relative flex gap-3 pb-4 last:pb-0">
          <span className="relative flex w-2 shrink-0 justify-center">
            <span className="bg-accent absolute top-1.5 size-1.5 rounded-full" aria-hidden="true" />
            {index === rows.length - 1 ? null : (
              <span className="bg-border absolute top-3.5 bottom-[-1rem] w-px" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 space-y-0.5">
            <Text as="p" tone="body">
              {row.label}
            </Text>
            {row.detail === undefined ? null : (
              <Text as="p" tone="code" className="text-text-muted">
                {row.detail}
              </Text>
            )}
            <Text as="p" tone="caption" className="text-text-faint">
              {row.actor}, {row.when}
            </Text>
          </div>
        </li>
      ))}
    </ol>
  )
}
