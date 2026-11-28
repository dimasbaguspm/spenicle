import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Text } from '@/components/primitives/text'
import { formatMoney, type MoneyScale } from '@/lib/money'

import type { FlowMonth } from './overview'

/**
 * The year as a rhythm: a jade bar up for what came in, a brass bar down for what went out, and the
 * gap between them is what the month kept. Two lines on one scale made a flat band when a salary
 * dwarfed everything else; a diverging pair reads the same whether the income is ten thousand or
 * a hundred million.
 */
export function YearFlow({
  months,
  scale,
  height = 'h-56',
}: {
  months: readonly FlowMonth[]
  scale: MoneyScale
  height?: string | undefined
}) {
  if (months.every((month) => month.earned === 0 && month.spent === 0)) {
    return (
      <Text as="p" tone="muted">
        Nothing has moved in these twelve months yet.
      </Text>
    )
  }

  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={[...months]} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            tick={{ fill: 'var(--color-text-faint)', fontSize: 10 }}
          />
          <YAxis hide />
          <ReferenceLine y={0} stroke="var(--color-border-strong)" strokeWidth={1} />
          <Tooltip
            cursor={{ fill: 'var(--color-surface-sunken)' }}
            content={<FlowTooltip units={scale.units} />}
          />
          <Bar
            dataKey="earned"
            fill="var(--color-success)"
            fillOpacity={0.7}
            radius={[2, 2, 0, 0]}
            isAnimationActive={false}
          />
          <Bar
            dataKey="spent"
            fill="var(--color-accent)"
            fillOpacity={0.7}
            radius={[0, 0, 2, 2]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

type FlowTooltipProps = {
  active?: boolean | undefined
  payload?: readonly { payload?: FlowMonth }[] | undefined
  units: number
}

/** In, out, and what the month kept — the whole point of putting the two bars together. */
function FlowTooltip({ active, payload, units }: FlowTooltipProps) {
  const point = payload?.[0]?.payload

  if (active !== true || point === undefined) {
    return null
  }

  const rows = [
    { label: 'in', swatch: 'bg-success', value: point.earned },
    { label: 'out', swatch: 'bg-accent', value: -point.spent },
  ] as const

  return (
    <div className="border-border bg-surface min-w-40 space-y-1 rounded-md border px-3 py-2 shadow-sm">
      <Text as="p" tone="caption" className="text-text-faint">
        {point.label}
      </Text>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`${row.swatch} size-1.5 rounded-full`} aria-hidden="true" />
            <Text as="span" tone="caption" className="text-text-muted">
              {row.label}
            </Text>
          </span>
          <Text as="span" tone="figure" className="text-text text-xs">
            {formatMoney(String(row.value), units).toDisplay()}
          </Text>
        </div>
      ))}
      <div className="border-border flex items-center justify-between gap-4 border-t pt-1">
        <Text as="span" tone="caption" className="text-text-muted">
          kept
        </Text>
        <Text as="span" tone="figure" className="text-text text-xs">
          {point.net}
        </Text>
      </div>
    </div>
  )
}
