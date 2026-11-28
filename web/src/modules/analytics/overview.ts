import type { AnalyticsOverview } from '@/api/types'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

/** The window in days, inclusive on both ends: what an "a day" average is divided by. */
function windowDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return 1
  }

  return Math.round((end - start) / 86_400_000) + 1
}

export type OverviewFigures = {
  spent: string
  received: string
  net: string
  /** the net without its sign, for the figure that says "kept" or "short by" */
  netAbs: string
  /** true when the year spent more than it received */
  short: boolean
  /** what a day cost on average across the window, in minor units */
  aDay: string
  entries: number
  busiestOn: string
  busiest: string
}

/**
 * The five numbers at the top of the screen, all from one response: the two totals, what they
 * leave behind, what a day costs, and how many entries made them. Money stays integer minor
 * units all the way; only the bar widths downstream become floats.
 */
export function overviewFigures(overview: AnalyticsOverview, scale: MoneyScale): OverviewFigures {
  const spent = sumMinor(overview.months.map((month) => month.spend_minor))
  const received = sumMinor(overview.months.map((month) => month.income_minor))
  const net = sumMinor(overview.months.map((month) => month.net_minor))
  const days = BigInt(windowDays(overview.from, overview.to))

  const netAmount = formatMoney(net, scale.units)

  return {
    spent: formatMoney(spent, scale.units).toDisplay(),
    received: formatMoney(received, scale.units).toDisplay(),
    net: netAmount.toDisplay(),
    netAbs: netAmount.absolute().toDisplay(),
    short: netAmount.isNegative(),
    aDay: formatMoney((BigInt(spent) / days).toString(), scale.units).toDisplay(),
    entries: overview.stats.entries,
    busiestOn: overview.stats.busiest_on ?? '',
    busiest:
      overview.stats.busiest_spend_minor === undefined
        ? ''
        : formatMoney(overview.stats.busiest_spend_minor, scale.units).toDisplay(),
  }
}

/** A share of a total, as the width of a bar: integer arithmetic, floored at one pixel of ink. */
export function shareOf(amount: string, total: string): number {
  const whole = BigInt(total)

  if (whole === 0n) {
    return 0
  }

  return Math.max(1, Number((BigInt(amount) * 100n) / whole))
}
