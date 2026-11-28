import { useMemo } from 'react'

import { useCategories, useMonths } from '@/hooks/queries/use-analytics'
import { useMoney } from '@/hooks/use-money'
import { monthLabel, yearWindow } from '@/lib/date'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { MonthBars } from '@/components/widgets/month-bars'

/** Twelve months of spend, and where it went: bars for time, proportional rows for categories. */
export function AnalyticsPage() {
  const { from, to } = yearWindow()
  const months = useMonths(from, to)
  const categories = useCategories({ from, to, kind: 'expense', rollup: 'parent' })
  const money = useMoney()

  const series = months.data ?? []
  const rows = categories.data?.categories ?? []
  const bars = useMemo(
    () =>
      (months.data ?? []).map((month) => ({
        key: month.month,
        label: monthLabel(month.month),
        value: Number(month.spend_minor ?? '0'),
        title: `${month.month} · ${money.figure(month.spend_minor ?? '0')}`,
      })),
    [months.data, money],
  )
  const total = rows.reduce((sum, row) => sum + Number(row.amount_minor ?? '0'), 0)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Text as="p" tone="section">
          Analytics
        </Text>
        <Text as="h1" tone="display">
          A year in view
        </Text>
        <Text as="p" tone="muted">
          Spend against time, then the categories behind it. Minor units, no rounding.
        </Text>
      </header>

      <Panel className="space-y-5 p-5 sm:p-6">
        <Text as="p" tone="section">
          Spend per month
        </Text>
        {series.every((month) => Number(month.spend_minor ?? '0') === 0) ? (
          <Text as="p" tone="muted">
            Nothing has moved yet.
          </Text>
        ) : (
          <MonthBars height="h-40" bars={bars} />
        )}
      </Panel>

      <Panel className="space-y-4 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <Text as="p" tone="section">
            Where it went
          </Text>
          <Text as="p" tone="figure" className="text-ink-400 text-xs">
            {money.figure(String(total))}
          </Text>
        </div>

        {rows.length === 0 ? (
          <Text as="p" tone="muted">
            No categorised spend in this window.
          </Text>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => {
              const value = Number(row.amount_minor ?? '0')
              const width = total === 0 ? 0 : Math.round((value / total) * 100)

              return (
                <li key={row.account_ref} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-porcelain-100 min-w-0 truncate">{row.account_name}</span>
                    <Text as="span" tone="figure" className="text-ink-300 shrink-0 text-xs">
                      {money.figure(row.amount_minor ?? '0')}
                    </Text>
                  </div>
                  <div className="bg-ink-800/80 h-[3px] rounded-full">
                    <div
                      className="bg-brass-600/70 h-[3px] rounded-full"
                      style={{ width: `${Math.max(width, 1)}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
