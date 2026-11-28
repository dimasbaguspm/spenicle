import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'

/** The fields a mail row reads: the reference, its state, and the capture it produced. */
export type MessageLike = {
  ref: string
  status?: string | undefined
  source?: string | undefined
  received_at?: string | undefined
  observed_at?: string | undefined
  last_synced_at?: string | undefined
  skip_reason?: string | undefined
  capture_ref?: string | undefined
}

export type MessageRow = {
  ref: string
  when: string
  detail: string
  status: string
  tone: string
  captureRef?: string | undefined
}

const muted = 'text-text-muted'

/** status decides the colour; one the API adds later stays muted instead of unstyled. */
const tones: Record<string, string> = {
  captured: 'text-success',
  skipped: 'text-text-faint',
  failed: 'text-danger',
  gone: 'text-text-faint',
}

/** A skip says why in a word; the words the worker writes are these four. */
const reasons: Record<string, string> = {
  sender_not_allowed: 'sender not allowed',
  no_body: 'no body',
  duplicate: 'already captured',
}

export function messageRow(message: MessageLike): MessageRow {
  const status = message.status ?? ''
  const reason = reasons[message.skip_reason ?? ''] ?? message.skip_reason ?? absent

  return {
    ref: message.ref,
    when: formatDate(message.received_at, DateFormat.Timestamp),
    detail: [
      message.source ?? 'gmail',
      status === 'skipped' ? reason : absent,
      message.last_synced_at === undefined
        ? absent
        : `synced ${formatDate(message.last_synced_at, DateFormat.Timestamp)}`,
    ]
      .filter((part) => part !== absent && part !== '')
      .join(' - '),
    status: status === '' ? absent : status,
    tone: tones[status] ?? muted,
    captureRef: message.capture_ref,
  }
}
