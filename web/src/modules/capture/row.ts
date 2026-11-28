import type { Capture } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'

/** The fields a capture row reads: a nested summary or a partial row still satisfies them. */
export type CaptureLike = Pick<Capture, 'ref'> & {
  kind?: string | undefined
  status?: string | undefined
  received_at?: string | undefined
}

/** One capture as a row renders it: when it arrived, what it is, and what it wants. */
export type CaptureRow = {
  ref: string
  time: string
  kind: string
  status: string
  statusTone: string
  needsAttention: boolean
}

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

/** the wire sends RFC3339; an inbox row shows the minute of it, which is all a review needs */
export function captureRow(capture: CaptureLike): CaptureRow {
  const kind = capture.kind ?? ''
  const status = capture.status ?? ''

  return {
    ref: capture.ref,
    time: formatDate(capture.received_at, DateFormat.Timestamp),
    kind: kind === '' ? absent : kind,
    status: status === '' ? absent : status,
    statusTone: tones[status] ?? muted,
    needsAttention: status === 'pending' || status === 'extracting',
  }
}
