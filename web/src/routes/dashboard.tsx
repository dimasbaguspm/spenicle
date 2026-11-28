import { Link } from '@tanstack/react-router'
import { ArrowRight, Plus } from 'lucide-react'

import { buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useDashboard } from '@/hooks/queries/use-dashboard'
import { useEntries } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { DateFormat } from '@/lib/date'
import { absent } from '@/lib/text'
import { EntryTicker, MonthSeries, accountIndex, monthLabel, monthsBack } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const overviewCrumbs = [{ label: 'Overview' }] as const

/**
 * The landing screen: the month's three figures, the year as a row of bars, and the last few
 * entries. Every number comes from one `/api/dashboard` call, so the tiles cannot disagree.
 */
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
  const fresh = latest.isSuccess && rows.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        items={overviewCrumbs}
        title="Overview"
        action={
          <Link
            to="/ledger/new"
            search={{ mode: 'manual' }}
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
            New entry
          </Link>
        }
      />

      {dashboard.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {dashboard.error.message}
        </Text>
      )}

      {fresh ? (
        <Panel>
          <div className="max-w-prose space-y-3 p-6 sm:p-8">
            <Text as="p" tone="section">
              An empty ledger
            </Text>
            <Text as="h2" tone="title" className="text-2xl">
              Nothing logged yet
            </Text>
            <Text as="p" tone="muted" className="leading-relaxed">
              Log the next thing you pay for. It takes an amount, a category and the account it
              left, and the figures on this screen fill themselves in from then on.
            </Text>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link
                to="/ledger/new"
                search={{ mode: 'manual' }}
                className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
              >
                <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
                Log an entry
              </Link>
              <Link to="/setup" className={cn(buttonStyles({ tone: 'ghost', size: 'sm' }))}>
                Instance setup
                <ArrowRight className="size-3.5" aria-hidden="true" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <>
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
                Nothing in this window.
              </Text>
            ) : (
              <div className="mt-3">
                <EntryTicker entries={rows} accounts={accounts} scale={money.scale} />
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
