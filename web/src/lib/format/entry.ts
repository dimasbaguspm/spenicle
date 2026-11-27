import type { Posting } from '@/api/types'

/**
 * The entry fields a row renders. `note`, `payee` and `reversed_at` are the ones Go's
 * `omitempty` really drops, and `postings` is the `Fixed<>` caveat: typed as there, empty in
 * practice.
 */
type EntryFields = {
  note?: string | undefined
  payee?: { name?: string | undefined; ref?: string | undefined } | undefined
  postings?: Posting[] | undefined
  reversed_at?: string | undefined
}

export const absent = '—'

export function hasNote(entry: EntryFields): boolean {
  return entry.note !== undefined
}

export function entryNote(entry: EntryFields): string {
  return entry.note ?? absent
}

export function isReversed(entry: EntryFields): boolean {
  return entry.reversed_at !== undefined
}

/** the payee is what a reader recognises, the note is why: one line holds both when it has them. */
export function entryTitle(entry: EntryFields): string {
  const payee = entry.payee?.name

  if (payee === undefined) {
    return entry.note ?? absent
  }

  return entry.note === undefined ? payee : `${payee} · ${entry.note}`
}

export function entryPostings(entry: EntryFields): Posting[] {
  return entry.postings ?? []
}
