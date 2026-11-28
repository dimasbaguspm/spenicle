import type { CustomRun } from '@/api/types'
import { Text } from '@/components/primitives/text'
import type { MoneyScale } from '@/lib/money'
import { MonthLine, MonthSeries, monthBars } from '@/modules/month'

import { CategoryBreakdown } from './category-breakdown'
import { CategoryPie } from './category-pie'

/**
 * A saved view draws what it was told to draw: the namespace picks the data, the chart picks the
 * rendering. The API refuses an unknown pair, so the two switches below are exhaustive on purpose —
 * no fallback that quietly turns a pie into bars.
 */
export function SavedChart({ run, scale }: { run: CustomRun; scale: MoneyScale }) {
  const chart = run.query?.chart ?? 'bar'
  const months = run.months ?? []
  const categories = run.categories ?? []

  if ((run.query?.namespace ?? 'months') === 'months') {
    if (months.length === 0) {
      return (
        <Text as="p" tone="muted">
          Nothing moved in this window.
        </Text>
      )
    }

    return chart === 'line' ? (
      <MonthLine bars={monthBars(months, scale)} height="h-40" />
    ) : (
      <MonthSeries months={months} scale={scale} height="h-40" />
    )
  }

  return chart === 'pie' ? (
    <CategoryPie categories={categories} scale={scale} />
  ) : (
    <CategoryBreakdown categories={categories} scale={scale} />
  )
}
