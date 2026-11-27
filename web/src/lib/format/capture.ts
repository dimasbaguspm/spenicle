/**
 * A capture as a row renders it. The wire type promises these fields; a partial row, a nested
 * summary or a future screen may not carry them, so each one arrives optional and leaves with
 * the fallback this module already knows.
 */
type CaptureFields = {
  kind?: string | undefined
  received_at?: string | undefined
  resolved_at?: string | undefined
  status?: string | undefined
}

export type FormattedCapture = {
  time: string
  kind: string
  status: string
  statusTone: string
  isResolved: boolean
  needsAttention: boolean
}

const absent = '—'

const muted = 'text-text-muted'

/** status decides the colour; one the API adds later stays muted instead of unstyled. */
const tones: Record<string, string> = {
  captured: 'text-success',
  approved: 'text-success',
  pending: 'text-warning',
  extracting: 'text-warning',
  duplicate: 'text-info',
  rejected: 'text-danger',
  failed: 'text-danger',
}

/** the wire sends RFC3339; a list row shows the minute of it, no seconds, no offset. */
function formatTime(received: string | undefined): string {
  return received === undefined ? absent : received.slice(0, 16).replace('T', ' ')
}

/** one call answers every question a capture row asks: fallbacks, tone and both flags. */
export function formatCaptureData(capture: CaptureFields): FormattedCapture {
  return {
    time: formatTime(capture.received_at),
    kind: capture.kind ?? absent,
    status: capture.status ?? absent,
    statusTone: tones[capture.status ?? ''] ?? muted,
    isResolved: capture.resolved_at !== undefined,
    needsAttention: capture.status === 'pending' || capture.status === 'extracting',
  }
}
