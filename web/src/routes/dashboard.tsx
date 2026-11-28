import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Panel } from '@/components/primitives/panel'
import { PageHeader } from '@/components/primitives/page-header'
import { Text } from '@/components/primitives/text'
import { useDashboard } from '@/hooks/queries/use-dashboard'
import { useEntries } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { DateFormat } from '@/lib/date'
import { absent } from '@/lib/text'
import { EntryTicker, MonthSeries, accountIndex, monthLabel, monthsBack } from '@/modules'

/**
 * The landing screen: the month's three figures, the year as a row of bars, and the last few
 * entries. Every number comes from one `/api/dashboard` call, so the tiles cannot disagree.
 */
/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const overviewCrumbs = [{ label: 'Overview' }] as const

export function DashboardPage() {
  const { from, to } = monthsBack(6)
  const dashboard = useDashboard(from, to)
  const latest = useEntries({ limit: 6 })
  const meta = useMeta()
  const money = useMoney()

  const data = dashboard.data
  const months = data?.months ?? []
  const rows = latest.data?.entries ?? []
  const accounts = accountIndex(meta.data?.accounts ?? [])
  const monthOf = data?.month === undefined ? '' : monthLabel(data.month, DateFormat.MonthLong)

  return (
    <div className="space-y-6">
      <PageHeader items={overviewCrumbs} title="Overview" />

      {dashboard.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {dashboard.error.message}
        </Text>
      )}

      <Panel className="divide-border grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { label: 'Spent', minor: data?.spend_minor, tone: 'text-text' },
          { label: 'Income', minor: data?.income_minor, tone: 'text-success' },
          { label: 'Net', minor: data?.net_minor, tone: 'text-text' },
        ].map((tile) => (
          <div key={tile.label} className="space-y-1 px-5 py-4 sm:px-6 sm:py-5">
            <Text as="p" tone="section">
              {tile.label}, {monthOf}
            </Text>
            <Text as="p" tone="figure" className={`text-2xl ${tile.tone}`}>
              {tile.minor === undefined ? absent : money.figure(tile.minor)}
            </Text>
          </div>
        ))}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-12">
        <Panel className="space-y-5 p-5 sm:p-6 lg:col-span-7">
          <div className="flex items-baseline justify-between gap-4">
            <Text as="p" tone="section">
              Spend, month by month
            </Text>
            <Link to="/analytics" className="text-text-muted hover:text-accent text-xs">
              Analytics
            </Link>
          </div>

          <MonthSeries months={months} scale={money.scale} height="h-28" />
        </Panel>

        <Panel className="space-y-4 p-5 sm:p-6 lg:col-span-5">
          <Text as="p" tone="section">
            Waiting for you
          </Text>
          <Link
            to="/captures"
            className="group flex items-baseline justify-between gap-4 rounded focus-visible:outline-offset-4"
          >
            <div>
              <Text as="p" tone="figure" className="text-2xl">
                {data?.pending_captures ?? 0}
              </Text>
              <Text as="p" tone="muted">
                captures to review
              </Text>
            </div>
            <ArrowRight
              className="text-text-faint group-hover:text-accent size-4"
              aria-hidden="true"
            />
          </Link>
          {data?.top_category === undefined ? null : (
            <div className="border-border space-y-1 border-t pt-4">
              <Text as="p" tone="section">
                Biggest category, six months
              </Text>
              <Text as="p" tone="body">
                {data.top_category.account_name}
              </Text>
              <Text as="p" tone="figure" className="text-text-muted">
                {money.figure(data.top_category.amount_minor)}
              </Text>
            </div>
          )}
        </Panel>
      </div>

      <Panel>
        <div className="flex items-baseline justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0">
          <Text as="p" tone="section">
            Latest entries
          </Text>
          <Link to="/ledger" className="text-text-muted hover:text-accent text-xs">
            Register
          </Link>
        </div>
        {rows.length === 0 ? (
          <Text as="p" tone="muted" className="p-5 sm:p-6">
            No entries yet.
          </Text>
        ) : (
          <div className="mt-3">
            <EntryTicker entries={rows} accounts={accounts} scale={money.scale} />
          </div>
        )}
      </Panel>
    </div>
  )
}
