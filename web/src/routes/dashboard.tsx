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
 * The landing screen: this month's three figures on one plate, the year beside them, the two
 * things that are waiting, and the last few entries. Every number comes from one `/api/dashboard`
 * call, so the tiles cannot disagree with each other.
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
  const net = data?.net_minor === undefined ? undefined : BigInt(data.net_minor)
  const fresh = latest.isSuccess && rows.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        items={overviewCrumbs}
        title="Your month"
        subtitle="This month's net, six months of bars, and the last few entries."
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
              <Link
                to="/manage/accounts/new"
                className={cn(buttonStyles({ tone: 'ghost', size: 'sm' }))}
              >
                Add an account
                <ArrowRight className="size-3.5" aria-hidden="true" strokeWidth={2} />
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <>
          <Panel className="grid divide-y divide-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
            <div className="space-y-5 p-5 sm:p-6">
              <Text as="p" tone="section">
                {monthOf === '' ? 'This month' : monthOf}
              </Text>

              <div className="space-y-1">
                <Text as="p" tone="caption" className="text-text-faint">
                  Net
                </Text>
                <Text
                  as="p"
                  tone="figure"
                  className={cn(
                    'text-3xl',
                    net === undefined ? 'text-text' : net > 0n ? 'text-success' : 'text-text',
                  )}
                >
                  {data?.net_minor === undefined ? absent : money.figure(data.net_minor)}
                  <span className="text-text-faint ml-2 text-sm">{money.scale.currency}</span>
                </Text>
              </div>

              <dl className="grid grid-cols-2 gap-4">
                <Figure
                  label="Spent"
                  value={data?.spend_minor === undefined ? absent : money.figure(data.spend_minor)}
                />
                <Figure
                  label="Received"
                  value={
                    data?.income_minor === undefined ? absent : money.figure(data.income_minor)
                  }
                />
              </dl>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-4">
                <Text as="p" tone="section">
                  Six months
                </Text>
                <Link to="/analytics" className="text-text-muted hover:text-accent text-xs">
                  Analytics
                </Link>
              </div>
              <MonthSeries months={months} scale={money.scale} height="h-28" />
            </div>
          </Panel>

          <div className="grid gap-6 sm:grid-cols-2">
            <Panel className="p-5 sm:p-6">
              <Link
                to="/manage/captures"
                className="group flex items-baseline justify-between gap-4"
              >
                <span className="space-y-1">
                  <Text as="p" tone="section">
                    Waiting for you
                  </Text>
                  <Text as="p" tone="figure" className="text-2xl">
                    {data?.pending_captures ?? 0}
                  </Text>
                  <Text as="p" tone="muted">
                    captures to review
                  </Text>
                </span>
                <ArrowRight
                  className="text-text-faint group-hover:text-accent size-4 shrink-0"
                  aria-hidden="true"
                />
              </Link>
            </Panel>

            <Panel className="p-5 sm:p-6">
              {data?.top_category === undefined ? (
                <div className="space-y-1">
                  <Text as="p" tone="section">
                    Biggest category
                  </Text>
                  <Text as="p" tone="muted">
                    Nothing categorised in six months.
                  </Text>
                </div>
              ) : (
                <Link
                  to="/manage/categories/$ref"
                  params={{ ref: data.top_category.account_ref }}
                  className="group flex items-baseline justify-between gap-4"
                >
                  <span className="space-y-1">
                    <Text as="p" tone="section">
                      Biggest category, six months
                    </Text>
                    <Text as="p" tone="body">
                      {data.top_category.account_name}
                    </Text>
                    <Text as="p" tone="figure" className="text-text-muted">
                      {money.figure(data.top_category.amount_minor)}
                    </Text>
                  </span>
                  <ArrowRight
                    className="text-text-faint group-hover:text-accent size-4 shrink-0"
                    aria-hidden="true"
                  />
                </Link>
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

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-text-faint text-[0.5625rem] tracking-[0.16em] uppercase">{label}</dt>
      <dd className="text-text font-mono text-sm">{value}</dd>
    </div>
  )
}
