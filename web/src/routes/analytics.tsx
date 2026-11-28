import { useState } from 'react'

import { Button } from '@/components/primitives/button'
import { Field } from '@/components/primitives/field'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel, PanelHead } from '@/components/primitives/panel'
import { SelectInput } from '@/components/primitives/select-input'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import {
  useCategories,
  useCreateCustomQuery,
  useCustomRun,
  useMonths,
  usePatchCustomQuery,
} from '@/hooks/queries/use-analytics'
import { useMoney } from '@/hooks/use-money'
import { formatMoney, sumMinor } from '@/lib/money'
import { readViews, rememberView, type SavedView } from '@/lib/saved-views'
import { CategoryBreakdown, categoryTotal, MonthSeries, monthsBack, SavedChart } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const analyticsCrumbs = [{ label: 'Analytics' }] as const

const namespaces = [
  { label: 'Months', value: 'months' },
  { label: 'Categories', value: 'categories' },
] as const

const charts = ['bar', 'line', 'pie'] as const

type Namespace = (typeof namespaces)[number]['value']
type Chart = (typeof charts)[number]

/** The listbox answers a string; the API wants one of its enum members. */
const asNamespace = (value: string): Namespace => (value === 'categories' ? 'categories' : 'months')
const asChart = (value: string): Chart =>
  value === 'line' ? 'line' : value === 'pie' ? 'pie' : 'bar'

/** A pie of months is a share of the year; a line of categories is not a thing, so neither is offered. */
const chartsFor = (namespace: Namespace): readonly Chart[] =>
  namespace === 'months' ? ['bar', 'line'] : ['bar', 'pie']

/** Twelve months of spend, and where it went: bars for time, proportional rows for categories. */
export function AnalyticsPage() {
  const { from, to } = monthsBack(12)
  const months = useMonths(from, to)
  const categories = useCategories({ from, to, kind: 'expense', rollup: 'parent' })
  const money = useMoney()

  const series = months.data ?? []
  const rows = categories.data?.categories ?? []
  const spend = sumMinor(series.map((month) => month.spend_minor))
  const income = sumMinor(series.map((month) => month.income_minor))
  const net = sumMinor(series.map((month) => month.net_minor))

  return (
    <div className="space-y-6">
      <PageHeader items={analyticsCrumbs} title="A year in view" />

      <Panel className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <Text as="p" tone="section">
            Spend per month
          </Text>
          <Text as="p" tone="caption" className="text-text-faint">
            spent {formatMoney(spend, money.scale.units).toDisplay(money.scale.currency)}, received{' '}
            {formatMoney(income, money.scale.units).toDisplay(money.scale.currency)}, net{' '}
            {formatMoney(net, money.scale.units).toDisplay(money.scale.currency)}
          </Text>
        </div>
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

      <SavedViews />
    </div>
  )
}

/**
 * The saved views. `POST /api/analytics/custom` answers a ref and there is no list route, so the
 * refs this browser created are kept in `localStorage`; a view saved elsewhere is opened by its ref.
 */
function SavedViews() {
  const money = useMoney()
  const { from, to } = monthsBack(12)

  const [views, setViews] = useState<SavedView[]>(() => readViews())
  const [open, setOpen] = useState('')
  const [name, setName] = useState('')
  const [namespace, setNamespace] = useState<Namespace>('months')
  const [chart, setChart] = useState<Chart>('bar')
  const [byRef, setByRef] = useState('')

  const create = useCreateCustomQuery()
  const patch = usePatchCustomQuery()
  const run = useCustomRun(open, { from, to })

  return (
    <Panel>
      <div className="space-y-4 p-5 sm:p-6">
        <PanelHead
          eyebrow="Saved views"
          description="A name, a namespace and a chart. Running one is a GET, so it answers the same shape every time."
        />

        <form
          className="grid gap-4 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault()
            create.mutate(
              { name, namespace, chart },
              {
                onSuccess: (saved) => {
                  setViews(rememberView(saved))
                  setOpen(saved.ref)
                  setName('')
                },
              },
            )
          }}
        >
          <Field label="Name">
            <TextInput
              name="view-name"
              placeholder="Spend per month"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </Field>
          <Field label="Namespace">
            <SelectInput
              value={namespace}
              options={[...namespaces]}
              onChange={(next) => {
                const chosen = asNamespace(next)

                setNamespace(chosen)

                if (!chartsFor(chosen).includes(chart)) {
                  setChart('bar')
                }
              }}
            />
          </Field>
          <Field label="Chart">
            <SelectInput
              value={chart}
              options={chartsFor(namespace).map((option) => ({ label: option, value: option }))}
              onChange={(next) => {
                setChart(asChart(next))
              }}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" tone="quiet" loading={create.isPending} disabled={name === ''}>
              Save view
            </Button>
          </div>
        </form>

        {create.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {create.error.message}
          </Text>
        )}

        {views.length === 0 ? (
          <Text as="p" tone="muted">
            No saved view in this browser yet.
          </Text>
        ) : (
          <ul className="divide-border divide-y">
            {views.map((view) => (
              <li key={view.ref} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <button
                  type="button"
                  className="text-text min-w-0 flex-1 truncate text-left"
                  onClick={() => {
                    setOpen(view.ref)
                  }}
                >
                  {view.name}
                </button>
                <Text as="span" tone="caption" className="text-text-faint">
                  {view.namespace}, {view.chart}
                </Text>
                <span className="flex items-center gap-1">
                  {chartsFor(asNamespace(view.namespace)).map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={
                        option === view.chart
                          ? 'border-border-strong text-text rounded border px-1.5 text-[0.6875rem] uppercase'
                          : 'text-text-faint hover:text-text rounded border border-transparent px-1.5 text-[0.6875rem] uppercase'
                      }
                      onClick={() => {
                        patch.mutate(
                          { ref: view.ref, body: { chart: option } },
                          {
                            onSuccess: (saved) => {
                              setViews(rememberView(saved))
                            },
                          },
                        )
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </span>
                <Button
                  tone="quiet"
                  size="sm"
                  onClick={() => {
                    setOpen(view.ref)
                  }}
                >
                  Run
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <Field label="Open by ref">
            <TextInput
              name="view-ref"
              placeholder="32 hex"
              value={byRef}
              onChange={(event) => {
                setByRef(event.target.value.trim())
              }}
            />
          </Field>
          <Button
            tone="quiet"
            size="sm"
            disabled={byRef.length !== 32}
            onClick={() => {
              setOpen(byRef)
            }}
          >
            Open
          </Button>
        </div>

        {patch.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {patch.error.message}
          </Text>
        )}
        {run.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {run.error.message}
          </Text>
        )}

        {open === '' || run.data === undefined ? null : (
          <div className="border-border space-y-3 rounded-md border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <Text as="p" tone="body">
                {run.data.query?.name ?? 'saved view'}
              </Text>
              <Text as="p" tone="caption" className="text-text-faint">
                {run.data.from} to {run.data.to}
              </Text>
            </div>
            <SavedChart run={run.data} scale={money.scale} />
          </div>
        )}
      </div>
    </Panel>
  )
}
