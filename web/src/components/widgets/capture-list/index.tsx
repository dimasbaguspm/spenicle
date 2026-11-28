import { Text } from '@/components/primitives/text'
import { formatCaptureData } from '@/lib/format/capture'

type CaptureRow = {
  ref?: string | undefined
  kind?: string | undefined
  status?: string | undefined
  received_at?: string | undefined
}

type CaptureListProps = {
  rows: CaptureRow[]
}

/**
 * A widget: the inbox rows as one screen section. It owns the three-column rhythm and knows
 * nothing about fetching, query keys or routing — the page hands it rows and it renders them.
 */
export function CaptureList({ rows }: CaptureListProps) {
  return (
    <ul className="border-ink-800/70 divide-ink-800/70 divide-y border-t">
      {rows.map((capture) => {
        const row = formatCaptureData(capture)

        return (
          <li
            key={capture.ref}
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
