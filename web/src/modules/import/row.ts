import type { Account, ImportBatch, Payee } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'
import { formatMoney, type MoneyScale } from '@/lib/money'
import { absent } from '@/lib/text'

/** The fields a batch row reads: the list route never inlines the rows, only their count. */
export type BatchLike = Pick<ImportBatch, 'ref' | 'status'> & {
  filename?: string | undefined
  rows_total?: number | undefined
  currency?: string | undefined
  created_at?: string | undefined
}

/** One batch as a row renders it: the file it came from, how much is in it, and where it sits. */
export type BatchRow = {
  ref: string
  title: string
  caption: string
  status: string
  tone: string
  open: boolean
}

/** The fields a statement row reads, all of them optional on the wire. */
export type StatementLike = {
  row_index: number
  occurred_on?: string | undefined
  amount_minor?: string | undefined
  description?: string | undefined
  status?: string | undefined
  clash_kind?: string | undefined
  clash_entry_ref?: string | undefined
  category_ref?: string | undefined
  suggested_category_ref?: string | undefined
  payee_ref?: string | undefined
}

/** One line of the statement: when, what for, how much, and what the upload made of it. */
export type StatementRow = {
  index: number
  day: string
  description: string
  amount: string
  out: boolean
  status: string
  tone: string
  clash: string
  clashRef?: string | undefined
  category: string
  suggested: boolean
}

const muted = 'text-text-muted'

/** status decides the colour; one the API adds later stays muted instead of unstyled. */
const tones: Record<string, string> = {
  draft: 'text-warning',
  pending: 'text-text-muted',
  accepted: 'text-success',
  skipped: 'text-text-faint',
  committing: 'text-info',
  committed: 'text-success',
  rejected: 'text-danger',
}

/** What the clash probe decided at upload, in the words a person reads. */
const clashes: Record<string, string> = {
  already_imported: 'already imported',
  duplicate: 'duplicate',
  possible_duplicate: 'possible duplicate',
  invalid_row: 'does not parse',
}

export function batchRow(batch: BatchLike): BatchRow {
  const status = batch.status ?? ''
  const count = batch.rows_total === undefined ? absent : `${String(batch.rows_total)} rows`

  return {
    ref: batch.ref,
    title: batch.filename === undefined || batch.filename === '' ? 'statement' : batch.filename,
    caption: [count, batch.currency ?? '', formatDate(batch.created_at, DateFormat.Timestamp)]
      .filter((part) => part !== absent && part !== '')
      .join(' - '),
    status: status === '' ? absent : status,
    tone: tones[status] ?? muted,
    open: status === 'draft' || status === 'committing',
  }
}

export function statementRow(
  row: StatementLike,
  accounts: readonly Account[],
  payees: readonly Payee[],
  scale: MoneyScale,
): StatementRow {
  const amount = formatMoney(row.amount_minor ?? '0', scale.units)
  const category = accounts.find(
    (account) => account.ref === (row.category_ref ?? row.suggested_category_ref),
  )
  const payee = payees.find((name) => name.ref === row.payee_ref)

  return {
    index: row.row_index,
    day: formatDate(row.occurred_on, DateFormat.Iso),
    description: row.description === undefined || row.description === '' ? absent : row.description,
    amount: amount.toDisplay(),
    out: amount.sign() < 0,
    status: row.status ?? absent,
    tone: tones[row.status ?? ''] ?? muted,
    clash: clashes[row.clash_kind ?? ''] ?? absent,
    clashRef: row.clash_entry_ref,
    category:
      payee === undefined
        ? (category?.name ?? absent)
        : `${category?.name ?? absent}, ${payee.name}`,
    suggested: row.category_ref === undefined && row.suggested_category_ref !== undefined,
  }
}
