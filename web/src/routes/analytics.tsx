import type { AnalyticsOverview } from '@/api/types'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useOverview } from '@/hooks/queries/use-analytics'
import { useMoney } from '@/hooks/use-money'
import { DateFormat, formatDate } from '@/lib/date'
import {
  AccountFlows,
  CategoryDonut,
  monthsBack,
  overviewFigures,
  PayeeBars,
  YearArea,
} from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const analyticsCrumbs = [{ label: 'Analytics' }] as const

/**
 * Twelve months as a brief, from one call: the figure that says how the year went, the shape of it,
 * what the money was for, who it went to, and where it sat. `GET /api/analytics/overview` answers
 * all of it in one round trip, so the page draws one page instead of stitching four answers.
 */
export function AnalyticsPage() {
  const { from, to } = monthsBack(12)
  const overview = useOverview(from, to)

  return (
    <div className="space-y-6">
      <PageHeader
        items={analyticsCrumbs}
        title="A year in view"
        subtitle="Twelve months: what moved, where it went, who was paid, where the money sat."
      />

      {overview.data === undefined ? (
        <Panel>
          <Text as="p" tone="muted" className="p-5 sm:p-6">
            {overview.error === null ? 'Reading the year.' : overview.error.message}
          </Text>
        </Panel>
      ) : (
        <Brief overview={overview.data} />
      )}
    </div>
  )
}

/**
 * One loud figure, then the evidence. The net is the sentence — kept or short by — and the four
 * numbers beside it are what it was made of; everything below is the same year drawn four ways.
 */
function Brief({ overview }: { overview: AnalyticsOverview }) {
  const money = useMoney()
  const figures = overviewFigures(overview, money.scale)

  const cells = [
    { label: 'Spent', value: figures.spent },
    { label: 'Received', value: figures.received },
    { label: 'A day', value: figures.aDay },
    { label: 'Entries', value: String(figures.entries) },
  ]

  return (
    <>
      <Panel className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-end">
        <div className="space-y-1.5">
          <Text as="p" tone="caption" className="text-text-faint uppercase tracking-[0.14em]">
            {figures.short ? 'Short by' : 'Kept'}
          </Text>
          <Text
            as="p"
            tone="figure"
            className="text-text block text-[2rem] leading-none sm:text-[2.5rem]"
          >
            {figures.netAbs}
          </Text>
          <Text as="p" tone="caption" className="text-text-faint">
            {formatDate(overview.from, DateFormat.MonthLong)} to{' '}
            {formatDate(overview.to, DateFormat.MonthLong)}
          </Text>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label} className="space-y-1">
              <dt>
                <Text as="span" tone="caption" className="text-text-faint">
                  {cell.label}
                </Text>
              </dt>
              <dd>
                <Text as="span" tone="figure" className="text-text text-sm">
                  {cell.value}
                </Text>
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Text as="p" tone="section">
            The shape of the year
          </Text>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-3">
              {[
                { label: 'spent', swatch: 'bg-accent' },
                { label: 'received', swatch: 'bg-success' },
              ].map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className={`${item.swatch} size-1.5 rounded-full`} aria-hidden="true" />
                  <Text as="span" tone="caption" className="text-text-muted">
                    {item.label}
                  </Text>
                </span>
              ))}
            </span>
            <Text as="p" tone="caption" className="text-text-faint">
              {figures.busiestOn === ''
                ? 'nothing spent in this window'
                : `busiest day ${formatDate(figures.busiestOn, DateFormat.Day)} at ${figures.busiest}`}
            </Text>
          </div>
        </div>
        <YearArea months={overview.months} scale={money.scale} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Where it went
          </Text>
          <CategoryDonut categories={overview.categories} scale={money.scale} />
        </Panel>

        <Panel className="space-y-4 p-5 sm:p-6">
          <Text as="p" tone="section">
            Who you paid
          </Text>
          <PayeeBars payees={overview.payees} scale={money.scale} />
        </Panel>
      </div>

      <Panel className="space-y-4 p-5 sm:p-6">
        <Text as="p" tone="section">
          Where the money sat
        </Text>
        <AccountFlows accounts={overview.accounts} scale={money.scale} />
      </Panel>
    </>
  )
}
