import { Text } from '@/components/primitives/text'

import { captureRow, type CaptureLike } from './row'

/** The inbox as one screen section: it owns the row rhythm and knows nothing about fetching. */
export function CaptureList({ rows }: { rows: readonly CaptureLike[] }) {
  return (
    <ul className="border-ink-800/70 divide-ink-800/70 divide-y border-t">
      {rows.map((capture) => {
        const row = captureRow(capture)

        return (
          <li
            key={row.ref}
            className="hover:bg-ink-800/40 flex items-center gap-3 px-1 py-3 text-sm transition-colors"
          >
            <Text as="span" tone="figure" className="text-ink-400 w-32 shrink-0 text-xs">
              {row.time}
            </Text>
            <Text as="span" tone="body" className="min-w-0 flex-1 truncate">
              {row.kind}
            </Text>
            <Text as="span" tone="caption" className={row.statusTone}>
              {row.status}
            </Text>
          </li>
        )
      })}
    </ul>
  )
}
