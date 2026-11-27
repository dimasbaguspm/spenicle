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
    <ul className="divide-ink-800 divide-y">
      {rows.map((capture) => {
        const row = formatCaptureData(capture)

        return (
          <li key={capture.ref} className="flex items-baseline gap-3 py-2.5 text-sm">
            <Text as="span" tone="body" className="text-text-muted w-32 shrink-0 tabular-nums">
              {row.time}
            </Text>
            <Text as="span" tone="body" className="flex-1 truncate">
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
