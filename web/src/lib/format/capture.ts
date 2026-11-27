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

export const absent = '—'

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

export function captureKind(capture: CaptureFields): string {
  return capture.kind ?? absent
}

/** the wire sends RFC3339; a list row shows the minute of it, no seconds, no offset. */
export function captureTime(capture: CaptureFields): string {
  const received = capture.received_at

  return received === undefined ? absent : received.slice(0, 16).replace('T', ' ')
}

export function captureStatus(capture: CaptureFields): string {
  return capture.status ?? absent
}

export function captureStatusTone(capture: CaptureFields): string {
  return tones[capture.status ?? ''] ?? muted
}

export function isResolved(capture: CaptureFields): boolean {
  return capture.resolved_at !== undefined
}

export function needsAttention(capture: CaptureFields): boolean {
  return capture.status === 'pending' || capture.status === 'extracting'
}
