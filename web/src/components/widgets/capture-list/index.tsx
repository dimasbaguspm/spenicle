import { Text } from '@/components/primitives/text'
import { captureKind, captureStatus, captureStatusTone, captureTime } from '@/lib/format/capture'

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
      {rows.map((capture) => (
        <li key={capture.ref} className="flex items-baseline gap-3 py-2.5 text-sm">
          <Text as="span" tone="body" className="text-text-muted w-32 shrink-0 tabular-nums">
            {captureTime(capture)}
          </Text>
          <Text as="span" tone="body" className="flex-1 truncate">
            {captureKind(capture)}
          </Text>
          <Text as="span" tone="caption" className={captureStatusTone(capture)}>
            {captureStatus(capture)}
          </Text>
        </li>
      ))}
    </ul>
  )
}
