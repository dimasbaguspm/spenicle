import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'

import { useDashboard } from '@/hooks/queries/use-dashboard'
import { useEntries } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { monthLabel, windowMonths } from '@/lib/date'
import { formatDay } from '@/lib/format'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { MonthBars } from '@/components/widgets/month-bars'

/**
 * The landing screen: the month's three figures, the year as a row of bars, and the last few
 * entries. Every number comes from one `/api/dashboard` call, so the tiles cannot disagree.
 */
export function DashboardPage() {
  const { from, to } = windowMonths(6)
  const dashboard = useDashboard(from, to)
  const latest = useEntries({ limit: 6 })
  const meta = useMeta()
  const money = useMoney()

  // a posting is money only on an asset or a liability; the other side is the category
  const kinds = new Map(
    (meta.data?.accounts ?? []).map((account) => [account.ref ?? '', account.kind ?? '']),
  )

  const data = dashboard.data
  const months = data?.months ?? []
  const bars = useMemo(
    () =>
      (data?.months ?? []).map((month) => ({
        key: month.month,
        label: monthLabel(month.month),
        value: Number(month.spend_minor ?? '0'),
        title: `${month.month} · ${money.figure(month.spend_minor ?? '0')}`,
      })),
    [data?.months, money],
  )
  const rows = latest.data?.entries ?? []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Text as="p" tone="section">
          Overview
        </Text>
        <Text as="h1" tone="display">
          The last six months
        </Text>
        <Text as="p" tone="muted">
          {from} — {to} · {money.currency}
        </Text>
      </header>

      {dashboard.error === null ? null : (
        <Text as="p" tone="caption" className="text-oxblood-300" role="alert">
          {dashboard.error.message}
        </Text>
      )}

      <Panel className="divide-ink-800 grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          { label: 'Spent', minor: data?.spend_minor, tone: 'text-porcelain-100' },
          { label: 'Income', minor: data?.income_minor, tone: 'text-jade-300' },
          { label: 'Net', minor: data?.net_minor, tone: 'text-porcelain-100' },
        ].map((tile) => (
          <div key={tile.label} className="space-y-1 px-5 py-4 sm:px-6 sm:py-5">
            <Text as="p" tone="section">
              {tile.label} · {data?.month === undefined ? '' : monthLabel(data.month)}
            </Text>
            <Text as="p" tone="figure" className={`text-2xl ${tile.tone}`}>
              {tile.minor === undefined ? '—' : money.figure(tile.minor)}
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
            <Link to="/analytics" className="text-ink-400 hover:text-brass-300 text-xs">
              Analytics
            </Link>
          </div>

          {months.every((month) => Number(month.spend_minor ?? '0') === 0) ? (
            <Text as="p" tone="muted">
              Nothing has moved yet.
            </Text>
          ) : (
            <MonthBars height="h-28" bars={bars} />
          )}
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
              className="text-ink-500 group-hover:text-brass-300 size-4"
              aria-hidden="true"
            />
          </Link>
          {data?.top_category === undefined ? null : (
            <div className="border-ink-800 space-y-1 border-t pt-4">
              <Text as="p" tone="section">
                Biggest category · six months
              </Text>
              <Text as="p" tone="body">
                {data.top_category.account_name}
              </Text>
              <Text as="p" tone="figure" className="text-ink-300">
                {money.figure(data.top_category.amount_minor ?? '0')}
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
          <Link to="/ledger" className="text-ink-400 hover:text-brass-300 text-xs">
            Register
          </Link>
        </div>
        {rows.length === 0 ? (
          <Text as="p" tone="muted" className="p-5 sm:p-6">
            No entries yet.
          </Text>
        ) : (
          <ul className="mt-3">
            {rows.map((entry) => {
              const shown =
                (entry.postings ?? []).find((row) =>
                  ['asset', 'liability'].includes(kinds.get(row.account_ref ?? '') ?? ''),
                ) ?? entry.postings?.[0]
              const minor = shown?.amount_minor ?? '0'
              const outgoing = minor.startsWith('-')

              return (
                <li
                  key={entry.ref}
                  className="border-ink-800/70 flex items-center gap-4 border-t px-5 py-3 text-sm first:border-t-0 sm:px-6"
                >
                  <Text as="span" tone="figure" className="text-ink-400 w-16 shrink-0 text-xs">
                    {formatDay(entry.occurred_on ?? '')}
                  </Text>
                  <span className="text-porcelain-100 min-w-0 flex-1 truncate">
                    {entry.note === undefined || entry.note === ''
                      ? (entry.payee?.name ?? '—')
                      : entry.note}
                  </span>
                  <Text
                    as="span"
                    tone="figure"
                    className={`shrink-0 text-xs ${outgoing ? 'text-porcelain-200' : 'text-jade-300'}`}
                  >
                    {outgoing ? `−${money.figure(minor.slice(1))}` : `+${money.figure(minor)}`}
                  </Text>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>
    </div>
  )
}
