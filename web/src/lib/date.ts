import dayjs, { type Dayjs } from 'dayjs'

import { absent } from '@/lib/text'

/**
 * Every date on screen is one of these, so a screen never writes a token string and two
 * screens cannot disagree about what a day looks like. `Iso` is the only shape the API accepts.
 */
export const DateFormat = {
  /** the wire: a local day, `YYYY-MM-DD` */
  Iso: 'YYYY-MM-DD',
  /** a register cell: `02 Nov` */
  Day: 'DD MMM',
  /** a chart axis or a month tile: `Nov 26` */
  Month: 'MMM YY',
  /** a sentence or a tooltip: `November 2026` */
  MonthLong: 'MMMM YYYY',
  /** a list row that carries a moment: `2026-11-02 09:41` */
  Timestamp: 'YYYY-MM-DD HH:mm',
  /** a clock alone: `09:41` */
  Time: 'HH:mm',
} as const

export type DateFormat = (typeof DateFormat)[keyof typeof DateFormat]

export type DateInput = string | number | Date | Dayjs | null | undefined

/**
 * The one date formatter: a value the API sent, a form field or a `Date`, rendered with the
 * named template. A missing value is `absent`; one that does not parse is shown as it came,
 * because a wrong date on screen beats a blank row.
 */
export function formatDate(value: DateInput, template: DateFormat): string {
  if (value === null || value === undefined || value === '') {
    return absent
  }

  const parsed = dayjs(value)

  return parsed.isValid() ? parsed.format(template) : String(value)
}
