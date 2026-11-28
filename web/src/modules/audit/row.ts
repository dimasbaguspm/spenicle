import type { AuditRow } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'

/** A journal line as a screen reads it: what happened, who did it, when, and what it points at. */
export type TimelineRow = {
  ref: string
  label: string
  detail: string | undefined
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

const first = (ref: string | undefined): string =>
  ref === undefined ? 'an entry' : ref.slice(0, 8)

/** The reversal rows carry the two refs that make a chain; everything else is a plain event. */
type ReversalSnapshot = {
  reversal_of_ref?: string
  reversal_entry_ref?: string
}

/**
 * One entry's own history, newest first. Rows are matched two ways, because the journal keys a
 * reversal to the mirror entry it wrote and only names the original in its snapshot: a row belongs
 * here when it happened to this entry, or when this entry is the parent it points at.
 */
export function timelineRows(rows: readonly AuditRow[], ref: string): TimelineRow[] {
  return rows.flatMap((row) => {
    const snapshot = (row.to ?? {}) as ReversalSnapshot
    const mine = row.entity_ref === ref
    const reversalOfMe = snapshot.reversal_of_ref === ref

    if (!mine && !reversalOfMe) {
      return []
    }

    const detail =
      row.action === 'reverse'
        ? mine
          ? `Reverses ${first(snapshot.reversal_of_ref)}`
          : `Reversed by ${first(snapshot.reversal_entry_ref)}`
        : undefined

    return [
      {
        ref: row.ref,
        label: labels[row.action] ?? row.action,
        detail,
        actor: row.actor_kind === 'worker' ? 'the worker' : 'you',
        when: formatDate(row.at, DateFormat.Timestamp),
      },
    ]
  })
}
