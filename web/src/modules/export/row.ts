import type { ExportJob } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'

/** The fields an export row reads: a job also carries the window it was asked for. */
export type ExportLike = Pick<ExportJob, 'ref' | 'format' | 'status' | 'bytes' | 'created_at'> & {
  from?: string | undefined
  to?: string | undefined
}

/** One export job as a row renders it: what it is, over what, how big and when it was asked for. */
export type ExportRow = {
  ref: string
  format: string
  status: string
  label: string
  window: string
  size: string
  when: string
  tone: string
  downloadable: boolean
}

const muted = 'text-text-muted'

/** status decides the colour; one the API adds later stays muted instead of unstyled. */
const tones: Record<string, string> = {
  running: 'text-warning',
  ready: 'text-success',
  failed: 'text-danger',
  expired: 'text-text-faint',
}

/** the two formats the API renders; a word it adds later is shown as it came */
const words: Record<string, string> = {
  json: 'JSON',
  csv: 'CSV',
}

function labelOf(format: string): string {
  if (format === '') {
    return 'Export'
  }

  return `${words[format] ?? format.toUpperCase()} export`
}

/** the window is a pair of days; an open one says which end it was left open at */
function windowOf(job: ExportLike): string {
  const from = job.from === undefined ? '' : job.from
  const to = job.to === undefined ? '' : job.to

  if (from === '' && to === '') {
    return 'the whole ledger'
  }

  const opened = from === '' ? undefined : formatDate(from, DateFormat.Iso)
  const closed = to === '' ? undefined : formatDate(to, DateFormat.Iso)

  if (opened === undefined) {
    return `to ${closed ?? absent}`
  }

  return closed === undefined ? `from ${opened}` : `${opened} to ${closed}`
}

const units = ['B', 'KB', 'MB', 'GB'] as const

/** a file size reads in one unit, never in a six-digit count of bytes */
function sizeOf(bytes: number | undefined): string {
  if (bytes === undefined || bytes <= 0) {
    return absent
  }

  let value = bytes
  let unit = 0

  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }

  const scale = units.at(unit) ?? 'B'

  return `${unit === 0 ? String(value) : value.toFixed(1)} ${scale}`
}

export function exportRow(job: ExportLike): ExportRow {
  const format = job.format ?? ''
  const status = job.status ?? ''

  return {
    ref: job.ref,
    format,
    status: status === '' ? absent : status,
    label: labelOf(format),
    window: windowOf(job),
    size: sizeOf(job.bytes),
    when: formatDate(job.created_at, DateFormat.Timestamp),
    tone: tones[status] ?? muted,
    downloadable: status === 'ready',
  }
}
