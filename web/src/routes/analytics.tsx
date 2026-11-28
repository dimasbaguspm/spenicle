import type { AnalyticsOverview } from '@/api/types'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useOverview } from '@/hooks/queries/use-analytics'
import { useMoney } from '@/hooks/use-money'
import { DateFormat, formatDate } from '@/lib/date'
import {
  AccountFlows,
  categoryRanks,
  MoneyRanks,
  monthLabel,
  monthlyFlow,
  monthsBack,
  overviewFigures,
  payeeRanks,
  YearFlow,
} from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const analyticsCrumbs = [{ label: 'Analytics' }] as const

/**
 * Twelve months as a brief, from one call: what the year left, the rhythm it left it in, one
 * ranking that covers both directions of the ledger, another by counterparty, and where the money
 * sat. `GET /api/analytics/overview` answers all of it in one round trip.
 */
export function AnalyticsPage() {
  const { from, to } = monthsBack(12)
  const overview = useOverview(from, to)

  return (
    <div className="space-y-6">
      <PageHeader
        items={analyticsCrumbs}
        title="A year in view"
        subtitle="Twelve months: what came in, what went out, and who moved it."
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
 * One loud figure, then the evidence. The headline is what the year left — kept or short by — and
 * the three numbers beside it are money a person recognises: what came in, what went out, what a
 * month costs. The entry count is a caption, not a tile: it is bookkeeping, not money.
 */
function Brief({ overview }: { overview: AnalyticsOverview }) {
  const money = useMoney()
  const figures = overviewFigures(overview, money.scale)

  const cells = [
    { label: 'Money in', value: figures.received },
    { label: 'Money out', value: figures.spent },
    { label: 'Average month', value: figures.averageMonth },
  ]

  return (
    <>
      <Panel className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-end">
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
            {formatDate(overview.from, DateFormat.Month)} to{' '}
            {formatDate(overview.to, DateFormat.Month)}
            {figures.keptShare === null ? '' : ` · ${String(figures.keptShare)}% of it stayed`}
            {` · ${String(figures.entries)} entries`}
          </Text>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
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
            The year in cash
          </Text>
          <Text as="p" tone="caption" className="text-text-faint">
            {figures.busiestOn === ''
              ? 'nothing spent in this window'
              : `biggest day ${formatDate(figures.busiestOn, DateFormat.Day)} at ${figures.busiest}`}
          </Text>
        </div>
        <YearFlow
          months={monthlyFlow(overview, money.scale, (month) => monthLabel(month))}
          scale={money.scale}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Text as="p" tone="section">
              Where it went and came from
            </Text>
            <Text as="p" tone="caption" className="text-text-faint">
              each side to its own largest
            </Text>
          </div>
          <MoneyRanks
            rows={categoryRanks(overview, money.scale)}
            scale={money.scale}
            labels={{ spend: 'spent', receive: 'earned' }}
          />
        </Panel>

        <Panel className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <Text as="p" tone="section">
              Who moved the money
            </Text>
            <Text as="p" tone="caption" className="text-text-faint">
              each side to its own largest
            </Text>
          </div>
          <MoneyRanks
            rows={payeeRanks(overview, money.scale)}
            scale={money.scale}
            labels={{ spend: 'paid out', receive: 'paid in' }}
          />
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
