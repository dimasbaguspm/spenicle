import type { AuditRow } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'

/** A journal line as a screen reads it: what happened, what it points at, who and when. */
export type TimelineRow = {
  ref: string
  label: string
  detail: string | undefined
  /** the other row this line is about, so the timeline can link instead of printing a hash */
  related: string | undefined
  actor: string
  when: string
}

const labels: Record<string, string> = {
  create: 'Logged',
  update: 'Edited',
  reverse: 'Reversed',
  approve: 'Approved',
  reject: 'Rejected',
  revoke: 'Revoked',
}

/** The reversal rows carry the two refs that make a chain; everything else is a plain event. */
type ReversalSnapshot = {
  reversal_of_ref?: string
  reversal_entry_ref?: string
}

const words = (kind: string): string => (kind === 'ledger_entry' ? 'entry' : kind.replace('_', ' '))

/**
 * One row's history. With a ref, only the lines that concern that entry are kept - its own events,
 * plus a reversal that names it as the parent, which the journal keys to the mirror instead.
 * Without a ref the caller already asked for one entity, so every row belongs.
 */
export function timelineRows(rows: readonly AuditRow[], ref?: string): TimelineRow[] {
  const seen = new Set<string>()

  return rows.flatMap((row) => {
    const snapshot = (row.to ?? {}) as ReversalSnapshot
    const mine = ref === undefined || row.entity_ref === ref
    const reversalOfMe = ref !== undefined && snapshot.reversal_of_ref === ref

    if ((!mine && !reversalOfMe) || seen.has(row.ref)) {
      return []
    }

    seen.add(row.ref)

    const other = mine ? snapshot.reversal_of_ref : snapshot.reversal_entry_ref
    const detail =
      row.action !== 'reverse'
        ? undefined
        : mine
          ? `Reverses ${words(row.entity_kind)} ${other?.slice(0, 8) ?? ''}`.trim()
          : `Reversed by ${words(row.entity_kind)} ${other?.slice(0, 8) ?? ''}`.trim()

    return [
      {
        ref: row.ref,
        label: labels[row.action] ?? row.action,
        detail,
        related: row.action === 'reverse' ? other : undefined,
        actor: row.actor_kind === 'worker' ? 'the worker' : 'you',
        when: formatDate(row.at, DateFormat.Timestamp),
      },
    ]
  })
}
