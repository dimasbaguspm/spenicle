/** A local-day `YYYY-MM-DD`, the only date shape the API accepts. */
export function isoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** The current calendar month: first day to today. */
export function monthWindow(today = new Date()): { from: string; to: string } {
  return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(today) }
}

/** The first day of the month `months - 1` back, up to today. */
export function windowMonths(months: number, today = new Date()): { from: string; to: string } {
  return {
    from: isoDay(new Date(today.getFullYear(), today.getMonth() - (months - 1), 1)),
    to: isoDay(today),
  }
}

/** Twelve months back, which is the cap the analytics routes enforce. */
export function yearWindow(today = new Date()): { from: string; to: string } {
  return {
    from: isoDay(new Date(today.getFullYear(), today.getMonth() - 11, 1)),
    to: isoDay(today),
  }
}

/** `2026-11` reads as `Nov 26`; the register and the charts use the same shape. */
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'short', year: '2-digit' })

export function monthLabel(month: string): string {
  const parsed = new Date(`${month}-01T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return month
  }

  return monthFormat.format(parsed)
}
