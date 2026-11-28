import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { CategoryTotal } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

/** Six slices tell a year; the seventh is everything else, in the plate's own grey. */
const slices = 6

type Slice = {
  name: string
  amount: string
  rest: boolean
}

/**
 * Where the money went, as a ring: one hue stepped down the rank, the tail in grey, and a legend
 * that carries the exact figure the ring can only suggest. Integer minor units decide the widths.
 */
export function CategoryDonut({
  categories,
  scale,
}: {
  categories: readonly CategoryTotal[]
  scale: MoneyScale
}) {
  if (categories.length === 0) {
    return (
      <Text as="p" tone="muted">
        No categorised spend in this window.
      </Text>
    )
  }

  const total = sumMinor(categories.map((row) => row.amount_minor))
  const head = categories.slice(0, slices)
  const tail = categories.slice(slices)
  const rows: Slice[] = head.map((row) => ({
    name: row.account_name,
    amount: row.amount_minor,
    rest: false,
  }))

  if (tail.length > 0) {
    rows.push({
      name: `${String(tail.length)} more`,
      amount: sumMinor(tail.map((row) => row.amount_minor)),
      rest: true,
    })
  }

  const plotted = rows.map((row) => ({ name: row.name, value: Number(row.amount) }))

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative size-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={plotted}
              dataKey="value"
              nameKey="name"
              innerRadius="70%"
              outerRadius="96%"
              paddingAngle={1}
              stroke="none"
              isAnimationActive={false}
            >
              {rows.map((row, index) => (
                <Cell
                  key={row.name}
                  fill={row.rest ? 'var(--color-border-strong)' : 'var(--color-accent)'}
                  fillOpacity={row.rest ? 0.35 : Math.max(0.32, 1 - index * 0.12)}
                />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip units={scale.units} />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <Text as="span" tone="caption" className="text-text-faint">
            spent
          </Text>
          <Text as="span" tone="figure" className="text-text text-sm">
            {formatMoney(total, scale.units).toDisplay()}
          </Text>
        </div>
      </div>

      <ul className="w-full min-w-0 space-y-2">
        {rows.map((row, index) => (
          <li key={row.name} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={
                  row.rest
                    ? 'border-border-strong size-1.5 shrink-0 rounded-full border'
                    : 'bg-accent size-1.5 shrink-0 rounded-full'
                }
                style={row.rest ? undefined : { opacity: Math.max(0.28, 1 - index * 0.14) }}
                aria-hidden="true"
              />
              <span className="text-text min-w-0 truncate">{row.name}</span>
            </span>
            <Text as="span" tone="figure" className="text-text-muted shrink-0 text-xs">
              {formatMoney(row.amount, scale.units).toDisplay()}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  )
}

type SliceItem = { name?: unknown; value?: unknown }
type SliceTooltipProps = {
  active?: boolean | undefined
  payload?: readonly SliceItem[] | undefined
  units: number
}

function SliceTooltip({ active, payload, units }: SliceTooltipProps) {
  const item = payload?.[0]

  if (active !== true || item === undefined) {
    return null
  }

  return (
    <div className="border-border bg-surface flex items-baseline gap-3 rounded-md border px-3 py-2 shadow-sm">
      <Text as="span" tone="caption" className="text-text-muted">
        {String(item.name ?? '')}
      </Text>
      <Text as="span" tone="figure" className="text-text text-xs">
        {formatMoney(String(item.value ?? '0'), units).toDisplay()}
      </Text>
    </div>
  )
}
