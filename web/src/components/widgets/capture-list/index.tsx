import { Text } from '@/components/primitives/text'

type CaptureRow = {
  ref?: string | undefined
  kind?: string | undefined
  status?: string | undefined
  received_at?: string | undefined
}

type CaptureListProps = {
  rows: CaptureRow[]
}

const tones: Record<string, string> = {
  captured: 'text-success',
  approved: 'text-success',
  pending: 'text-warning',
  extracting: 'text-warning',
  duplicate: 'text-info',
  rejected: 'text-danger',
  failed: 'text-danger',
}

function statusTone(status: string | undefined): string {
  return tones[status ?? ''] ?? 'text-text-muted'
}

/**
 * A widget: the inbox rows as one screen section. It owns the three-column rhythm and the
 * status colours, and knows nothing about fetching, query keys or routing — the page hands it
 * rows and it renders them.
 */
export function CaptureList({ rows }: CaptureListProps) {
  return (
    <ul className="divide-ink-800 divide-y">
      {rows.map((capture) => (
        <li key={capture.ref} className="flex items-baseline gap-3 py-2.5 text-sm">
          <Text as="span" tone="body" className="text-text-muted w-32 shrink-0 tabular-nums">
            {(capture.received_at ?? '').slice(0, 16).replace('T', ' ')}
          </Text>
          <Text as="span" tone="body" className="flex-1 truncate">
            {capture.kind ?? '—'}
          </Text>
          <Text as="span" tone="caption" className={statusTone(capture.status)}>
            {capture.status}
          </Text>
        </li>
      ))}
    </ul>
  )
}
