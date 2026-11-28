import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

import { Text } from '@/components/primitives/text'
import { DateFormat } from '@/lib/date'
import { formatMoney, type MoneyScale } from '@/lib/money'
import { monthLabel } from '@/modules/month'

type Point = {
  month: string
  label: string
  spent: number
  received: number
}

/**
 * Twelve months as two washes: spend in brass, income in jade, on one scale so the two are read
 * against each other rather than each against itself. The y axis is gone on purpose — a shape is
 * what this chart is for, and the tooltip carries the figures.
 */
export function YearArea({
  months,
  scale,
}: {
  months: readonly { month: string; spend_minor: string; income_minor: string }[]
  scale: MoneyScale
}) {
  const points: Point[] = months.map((month) => ({
    month: month.month,
    label: monthLabel(month.month),
    spent: Number(formatMoney(month.spend_minor, scale.units).toMinor()),
    received: Number(formatMoney(month.income_minor, scale.units).toMinor()),
  }))

  if (points.every((point) => point.spent === 0 && point.received === 0)) {
    return (
      <Text as="p" tone="muted">
        Nothing has moved in these twelve months yet.
      </Text>
    )
  }

  return (
    <div className="h-60 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="year-spend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="year-income" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-border-strong)' }}
            content={<YearTooltip units={scale.units} />}
          />
          <Area
            type="monotone"
            dataKey="received"
            name="received"
            stroke="var(--color-success)"
            strokeWidth={1.75}
            fill="url(#year-income)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="spent"
            name="spent"
            stroke="var(--color-accent)"
            strokeWidth={1.75}
            fill="url(#year-spend)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** The plate's own tooltip: a month, two figures, no chrome the palette did not ask for. */
type YearItem = { payload?: Point }
type YearTooltipProps = {
  active?: boolean | undefined
  payload?: readonly YearItem[] | undefined
  units: number
}

function YearTooltip({ active, payload, units }: YearTooltipProps) {
  const point = payload?.[0]?.payload

  if (active !== true || point === undefined) {
    return null
  }

  const rows = [
    { key: 'spent', label: 'spent', swatch: 'bg-accent' },
    { key: 'received', label: 'received', swatch: 'bg-success' },
  ] as const

  return (
    <div className="border-border bg-surface min-w-40 space-y-1 rounded-md border px-3 py-2 shadow-sm">
      <Text as="p" tone="caption" className="text-text-faint">
        {monthLabel(point.month, DateFormat.MonthLong)}
      </Text>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`${row.swatch} size-1.5 rounded-full`} aria-hidden="true" />
            <Text as="span" tone="caption" className="text-text-muted">
              {row.label}
            </Text>
          </span>
          <Text as="span" tone="figure" className="text-text text-xs">
            {formatMoney(String(point[row.key]), units).toDisplay()}
          </Text>
        </div>
      ))}
    </div>
  )
}
