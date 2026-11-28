import type { MonthTotal } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, type MoneyScale } from '@/lib/money'
import { monthLabel } from '@/modules/month'

/**
 * Twelve months as two filled areas: spend below, income above it, on one scale so the two are
 * comparable rather than each normalised to itself. A month with nothing in it still gets its
 * slot on the baseline — a gap in a year is information.
 */
export function MonthArea({ months, scale }: { months: readonly MonthTotal[]; scale: MoneyScale }) {
  const spend = months.map((month) => Number(formatMoney(month.spend_minor, scale.units).toMinor()))
  const income = months.map((month) =>
    Number(formatMoney(month.income_minor, scale.units).toMinor()),
  )
  const peak = Math.max(1, ...spend, ...income)

  if (months.length === 0) {
    return (
      <Text as="p" tone="muted">
        No month to draw yet.
      </Text>
    )
  }

  const points = (values: readonly number[]) =>
    values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * 100
        const y = 100 - (value / peak) * 94

        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')

  const spendLine = points(spend)
  const incomeLine = points(income)

  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label="Spend and income per month"
      >
        <polygon points={`0,100 ${incomeLine} 100,100`} className="fill-success/10" />
        <polygon points={`0,100 ${spendLine} 100,100`} className="fill-accent/15" />
        <polyline
          points={incomeLine}
          fill="none"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="stroke-success"
        />
        <polyline
          points={spendLine}
          fill="none"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          className="stroke-accent"
        />
      </svg>

      <ol className="flex items-stretch gap-1">
        {months.map((month) => (
          <li key={month.month} className="min-w-0 flex-1 text-center">
            <Text as="span" tone="caption" className="text-text-faint block truncate text-[0.5rem]">
              {monthLabel(month.month)}
            </Text>
          </li>
        ))}
      </ol>
    </div>
  )
}
