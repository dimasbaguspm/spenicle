import type { MonthTotal } from '@/api/types'
import { DateFormat, formatDate } from '@/lib/date'
import { formatMoney, type MoneyScale } from '@/lib/money'

/** A span of local days the API accepts, `YYYY-MM-DD` on both ends. */
export type MonthWindow = { from: string; to: string }

export type MonthBar = {
  key: string
  label: string
  value: number
  title: string
}

/** The first day of the month `count - 1` back, up to today: the window a month series needs. */
export function monthsBack(count: number, now = new Date()): MonthWindow {
  return {
    from: formatDate(new Date(now.getFullYear(), now.getMonth() - (count - 1), 1), DateFormat.Iso),
    to: formatDate(now, DateFormat.Iso),
  }
}

/** `2026-11` as a person reads it — the chart axis, the tile and the tooltip all ask here. */
export function monthLabel(month: string, template: DateFormat = DateFormat.Month): string {
  return formatDate(`${month}-01`, template)
}

/** `2026-11` as a bar: its label, the value the height comes from, and the figure behind it. */
export function monthBar(month: MonthTotal, scale: MoneyScale): MonthBar {
  const figure = formatMoney(month.spend_minor, scale.units)

  return {
    key: month.month,
    label: monthLabel(month.month),
    value: Number(figure.toMinor()),
    title: `${monthLabel(month.month, DateFormat.MonthLong)} · ${figure.toDisplay(scale.currency)}`,
  }
}

export function monthBars(months: readonly MonthTotal[], scale: MoneyScale): MonthBar[] {
  return months.map((month) => monthBar(month, scale))
}
