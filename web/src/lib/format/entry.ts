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

export type FormattedEntry = {
  title: string
  note: string
  isReversed: boolean
  postings: Posting[]
}

const absent = '—'

/** The register shows the day a reader says out loud; the API's exact ISO string stays in `title`. */
const dayFormat = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' })

/** A malformed date is not worth a crash in a list: the raw string is the honest fallback. */
export function formatDay(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return iso
  }

  return dayFormat.format(parsed)
}

/** the payee is what a reader recognises, the note is why: one line holds both when it has them. */
function formatTitle(entry: EntryFields): string {
  const payee = entry.payee?.name

  if (payee === undefined) {
    return entry.note ?? absent
  }

  return entry.note === undefined ? payee : `${payee} · ${entry.note}`
}

/** one call answers every question an entry row asks: the joined title, the note and its flags. */
export function formatEntryData(entry: EntryFields): FormattedEntry {
  return {
    title: formatTitle(entry),
    note: entry.note ?? absent,
    isReversed: entry.reversed_at !== undefined,
    postings: entry.postings ?? [],
  }
}
