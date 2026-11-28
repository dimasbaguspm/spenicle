import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { PayeeReport } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { formatMoney, type MoneyScale } from '@/lib/money'

/** Six names is what a horizontal axis can carry without turning into a list of tiny words. */
const names = 6

type Bar = { name: string; value: number }

/**
 * Who the money went to, as bars the way a person reads a ranking: longest first, the name beside
 * it. The spend that named nobody keeps its own bar — "I did not say who" is an answer.
 */
export function PayeeBars({
  payees,
  scale,
}: {
  payees: readonly PayeeReport[]
  scale: MoneyScale
}) {
  if (payees.length === 0) {
    return (
      <Text as="p" tone="muted">
        Nobody was paid in this window.
      </Text>
    )
  }

  const bars: Bar[] = payees.slice(0, names).map((row) => ({
    name: row.payee_name ?? 'Nobody in particular',
    value: Number(formatMoney(row.amount_minor, scale.units).toMinor()),
  }))

  return (
    <div className="space-y-3">
      <div className="w-full" style={{ height: Math.max(132, bars.length * 40) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bars}
            layout="vertical"
            margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
            barCategoryGap={8}
          >
            <YAxis
              type="category"
              dataKey="name"
              width={132}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            />
            <XAxis type="number" hide />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-sunken)' }}
              content={<PayeeTooltip units={scale.units} />}
            />
            <Bar
              dataKey="value"
              fill="var(--color-accent)"
              fillOpacity={0.62}
              radius={[0, 3, 3, 0]}
              barSize={10}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {payees.length > bars.length ? (
        <Text as="p" tone="caption" className="text-text-faint">
          {String(payees.length - bars.length)} more payees
        </Text>
      ) : null}
    </div>
  )
}

type PayeeItem = { name?: unknown; value?: unknown; payload?: { name?: string } }
type PayeeTooltipProps = {
  active?: boolean | undefined
  payload?: readonly PayeeItem[] | undefined
  units: number
}

function PayeeTooltip({ active, payload, units }: PayeeTooltipProps) {
  const item = payload?.[0]

  if (active !== true || item === undefined) {
    return null
  }

  return (
    <div className="border-border bg-surface flex items-baseline gap-3 rounded-md border px-3 py-2 shadow-sm">
      <Text as="span" tone="caption" className="text-text-muted">
        {String(item.payload?.name ?? '')}
      </Text>
      <Text as="span" tone="figure" className="text-text text-xs">
        {formatMoney(String(item.value ?? '0'), units).toDisplay()}
      </Text>
    </div>
  )
}
