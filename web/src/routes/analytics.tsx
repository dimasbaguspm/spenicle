import { Panel } from '@/components/primitives/panel'
import { PageHeader } from '@/components/primitives/page-header'
import { Text } from '@/components/primitives/text'
import { useCategories, useMonths } from '@/hooks/queries/use-analytics'
import { useMoney } from '@/hooks/use-money'
import { CategoryBreakdown, categoryTotal, MonthSeries, monthsBack } from '@/modules'

/** Twelve months of spend, and where it went: bars for time, proportional rows for categories. */
/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const analyticsCrumbs = [{ label: 'Analytics' }] as const

export function AnalyticsPage() {
  const { from, to } = monthsBack(12)
  const months = useMonths(from, to)
  const categories = useCategories({ from, to, kind: 'expense', rollup: 'parent' })
  const money = useMoney()

  const series = months.data ?? []
  const rows = categories.data?.categories ?? []

  return (
    <div className="space-y-6">
      <PageHeader items={analyticsCrumbs} title="A year in view" />

      <Panel className="space-y-5 p-5 sm:p-6">
        <Text as="p" tone="section">
          Spend per month
        </Text>
        <MonthSeries months={series} scale={money.scale} height="h-40" />
      </Panel>

      <Panel className="space-y-4 p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-4">
          <Text as="p" tone="section">
            Where it went
          </Text>
          <Text as="p" tone="figure" className="text-text-muted text-xs">
            {categoryTotal(rows, money.scale)}
          </Text>
        </div>

        <CategoryBreakdown categories={rows} scale={money.scale} />
      </Panel>
    </div>
  )
}
