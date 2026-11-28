import type { AnalyticsOverview } from '@/api/types'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

export type OverviewFigures = {
  /** what left the household, as money in the ledger's base currency */
  spent: string
  received: string
  net: string
  /** the net without its sign, for the figure that says "kept" or "short by" */
  netAbs: string
  /** true when the year spent more than it received */
  short: boolean
  /** what a month cost on average, so a household can compare it with its salary */
  averageMonth: string
  /** the share of what came in that stayed, as a whole percent; null when nothing came in */
  keptShare: number | null
  entries: number
  months: number
  busiestOn: string
  busiest: string
}

/**
 * The headline numbers, all from one response: two totals, what they leave behind, what a month
 * costs, and how much of the income stayed. Money stays integer minor units the whole way; only a
 * percentage and a bar width downstream are floats.
 */
export function overviewFigures(overview: AnalyticsOverview, scale: MoneyScale): OverviewFigures {
  const spent = sumMinor(overview.months.map((month) => month.spend_minor))
  const received = sumMinor(overview.months.map((month) => month.income_minor))
  const net = sumMinor(overview.months.map((month) => month.net_minor))
  const months = Math.max(1, overview.months.length)
  const netAmount = formatMoney(net, scale.units)

  return {
    spent: formatMoney(spent, scale.units).toDisplay(),
    received: formatMoney(received, scale.units).toDisplay(),
    net: netAmount.toDisplay(),
    netAbs: netAmount.absolute().toDisplay(),
    short: netAmount.isNegative(),
    averageMonth: formatMoney((BigInt(spent) / BigInt(months)).toString(), scale.units).toDisplay(),
    keptShare: BigInt(received) === 0n ? null : Number((BigInt(net) * 100n) / BigInt(received)),
    entries: overview.stats.entries,
    months: overview.months.length,
    busiestOn: overview.stats.busiest_on ?? '',
    busiest:
      overview.stats.busiest_spend_minor === undefined
        ? ''
        : formatMoney(overview.stats.busiest_spend_minor, scale.units).toDisplay(),
  }
}

/** A month as the diverging chart wants it: money in above the zero line, money out below. */
export type FlowMonth = {
  month: string
  label: string
  earned: number
  spent: number
  net: string
}

/**
 * One bar up and one bar down per month, so the year reads as a rhythm — the salary lands, the
 * month spends it — instead of two lines chasing each other on a shared scale.
 */
export function monthlyFlow(
  overview: AnalyticsOverview,
  scale: MoneyScale,
  label: (month: string) => string,
): FlowMonth[] {
  return flowFromMonths(overview.months, scale, label)
}

type MonthTotals = {
  month: string
  spend_minor: string
  income_minor: string
  net_minor: string
}

/** The same conversion for any month series — the dashboard hands its own six months in. */
export function flowFromMonths(
  months: readonly MonthTotals[],
  scale: MoneyScale,
  label: (month: string) => string,
): FlowMonth[] {
  return months.map((month) => ({
    month: month.month,
    label: label(month.month),
    earned: Number(formatMoney(month.income_minor, scale.units).toMinor()),
    spent: -Number(formatMoney(month.spend_minor, scale.units).toMinor()),
    net: formatMoney(month.net_minor, scale.units).toDisplay(),
  }))
}

/** One row of a diverging ranking: expenses carry a negative value, income a positive one. */
export type RankRow = {
  key: string
  name: string
  value: number
  amount: string
}

const rank = (
  rows: readonly { key: string; name: string; amount: string; sign: number }[],
  scale: MoneyScale,
): RankRow[] =>
  rows
    .map((row) => ({
      key: row.key,
      name: row.name,
      value: row.sign * Number(formatMoney(row.amount, scale.units).toMinor()),
      amount: formatMoney(row.amount, scale.units).toDisplay(),
    }))
    .toSorted((left, right) => Math.abs(right.value) - Math.abs(left.value))

/**
 * Where the money went and where it came from, in one ranking. Expense categories carry the debit
 * side of the ledger and income categories the credit side, so a single sorted list answers both
 * questions without a second tile that repeats the first one upside down.
 */
export function categoryRanks(overview: AnalyticsOverview, scale: MoneyScale): RankRow[] {
  return rank(
    [
      ...overview.categories.map((row) => ({
        key: row.account_ref,
        name: row.account_name,
        amount: row.amount_minor,
        sign: -1,
      })),
      ...overview.income_categories.map((row) => ({
        key: row.account_ref,
        name: row.account_name,
        amount: row.amount_minor,
        sign: 1,
      })),
    ],
    scale,
  )
}

/** The same ranking by counterparty: who was paid, and who paid you. */
export function payeeRanks(overview: AnalyticsOverview, scale: MoneyScale): RankRow[] {
  return rank(
    [
      ...overview.payees.map((row, index) => ({
        key: row.payee_ref ?? `unnamed-spend-${String(index)}`,
        name: row.payee_name ?? 'Nobody in particular',
        amount: row.amount_minor,
        sign: -1,
      })),
      ...overview.income_payees.map((row, index) => ({
        key: row.payee_ref ?? `unnamed-income-${String(index)}`,
        name: row.payee_name ?? 'Nobody in particular',
        amount: row.amount_minor,
        sign: 1,
      })),
    ],
    scale,
  )
}
