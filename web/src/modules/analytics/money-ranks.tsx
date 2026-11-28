import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Text } from '@/components/primitives/text'
import { formatMoney, type MoneyScale } from '@/lib/money'

import type { RankRow } from './overview'

/** The rows drawn, and the words the two directions get. */
export type RankLabels = {
  spend: string
  receive: string
}

/**
 * One ranking for both directions: expense rows bend left in brass, income rows bend right in jade,
 * a hairline down the middle. It replaces the pair of tiles that showed the same two lists twice,
 * once per side, and it answers "where did it go, and where did it come from" in one look.
 */
export function MoneyRanks({
  rows,
  scale,
  labels,
  limit = 10,
}: {
  rows: readonly RankRow[]
  scale: MoneyScale
  labels: RankLabels
  limit?: number | undefined
}) {
  if (rows.length === 0) {
    return (
      <Text as="p" tone="muted">
        Nothing on either side of the ledger in this window.
      </Text>
    )
  }

  const shown = rows.slice(0, limit)
  const rest = rows.length - shown.length

  // Each side is scaled to its own largest row. One shared scale would draw a single salary three
  // times longer than the rent that dominates the other side, and the expense rows would collapse
  // into a few pixels; the tooltip still carries the exact figure.
  const peak = (sign: 1 | -1) =>
    Math.max(
      1,
      ...shown
        .filter((row) => (sign === 1 ? row.value > 0 : row.value < 0))
        .map((row) => Math.abs(row.value)),
    )

  const spentPeak = peak(-1)
  const earnedPeak = peak(1)
  const plotted = shown.map((row) => ({
    ...row,
    plot: row.value < 0 ? row.value / spentPeak : row.value / earnedPeak,
  }))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        {[
          { label: labels.spend, swatch: 'bg-accent' },
          { label: labels.receive, swatch: 'bg-success' },
        ].map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`${item.swatch} size-1.5 rounded-full`} aria-hidden="true" />
            <Text as="span" tone="caption" className="text-text-muted">
              {item.label}
            </Text>
          </span>
        ))}
      </div>

      <div className="w-full" style={{ height: shown.length * 30 + 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={plotted}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barCategoryGap={6}
          >
            <XAxis type="number" hide domain={[-1, 1]} />
            <YAxis
              type="category"
              dataKey="name"
              width={124}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            />
            <ReferenceLine x={0} stroke="var(--color-border-strong)" strokeWidth={1} />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-sunken)' }}
              content={<RankTooltip units={scale.units} />}
            />
            <Bar dataKey="plot" barSize={11} radius={2} isAnimationActive={false}>
              {shown.map((row) => (
                <Cell
                  key={row.key}
                  fill={row.value < 0 ? 'var(--color-accent)' : 'var(--color-success)'}
                  fillOpacity={0.66}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {rest <= 0 ? null : (
        <Text as="p" tone="caption" className="text-text-faint">
          {String(rest)} more
        </Text>
      )}
    </div>
  )
}

type RankTooltipProps = {
  active?: boolean | undefined
  payload?: readonly { payload?: RankRow }[] | undefined
  units: number
}

function RankTooltip({ active, payload, units }: RankTooltipProps) {
  const row = payload?.[0]?.payload

  if (active !== true || row === undefined) {
    return null
  }

  return (
    <div className="border-border bg-surface flex items-baseline gap-3 rounded-md border px-3 py-2 shadow-sm">
      <Text as="span" tone="caption" className="text-text-muted">
        {row.name}
      </Text>
      <Text as="span" tone="figure" className="text-text text-xs">
        {formatMoney(row.amount, units).toDisplay()}
      </Text>
    </div>
  )
}
