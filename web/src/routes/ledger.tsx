import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { PageHeader } from '@/components/primitives/page-header'
import { Button, buttonStyles } from '@/components/primitives/button'
import { Plus } from 'lucide-react'

import { Panel, PanelHead } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useEntryPages } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { usePayees } from '@/hooks/queries/use-payees'
import { useFilterQuery } from '@/hooks/use-filter-query'
import { cn } from '@/lib/cn'
import {
  accountIndex,
  EntryFilterChips,
  EntryFilterRail,
  EntryFilterSheet,
  entryFilterSpec,
  EntryRegister,
} from '@/modules'

const listLimit = 100

/**
 * The register: a filter rail on a wide screen, a filter sheet on a phone, and the list in
 * between. The filter itself is the `entryFilterSpec` over the URL, so this screen never spells a
 * query param and a narrowed view is a link.
 */
/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const registerCrumbs = [{ label: 'Ledger', to: '/ledger' }, { label: 'Register' }] as const

export function LedgerPage() {
  const search = useSearch({ from: '/ledger' })
  const navigate = useNavigate({ from: '/ledger' })
  const meta = useMeta()
  const payees = usePayees()
  const money = useMoney()

  const filters = useFilterQuery({
    search,
    onChange: (next) => {
      void navigate({ search: next, replace: true })
    },
    spec: entryFilterSpec,
    limit: listLimit,
  })

  const entries = useEntryPages(filters.query)

  const accounts = meta.data?.accounts ?? []
  const index = accountIndex(accounts)
  const rows = entries.data?.pages.flatMap((page) => page.entries) ?? []
  const payeeRows = payees.data?.payees ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        items={registerCrumbs}
        title="Everything you logged"
        subtitle="Every entry, the newest day first. Narrow it with the rail."
        action={
          <Link
            to="/ledger/new"
            search={{ mode: 'manual' }}
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Plus className="size-4" aria-hidden="true" strokeWidth={1.75} />
            New entry
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[20%_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <EntryFilterRail
            value={filters.value}
            onApply={filters.apply}
            accounts={accounts}
            payees={payeeRows}
            total={rows.length}
          />
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <EntryFilterSheet
              value={filters.value}
              onApply={filters.apply}
              onClear={filters.clear}
              accounts={accounts}
              payees={payeeRows}
            />
            <Text as="p" tone="caption" className="text-text-faint">
              {rows.length === 0 ? 'nothing matched' : `${String(rows.length)} entries`}
            </Text>
          </div>

          <EntryFilterChips
            value={filters.value}
            accounts={accounts}
            payees={payeeRows}
            onDismiss={(key) => {
              filters.apply({ ...filters.value, [key]: undefined })
            }}
            onClearAll={filters.clear}
          />

          {entries.error === null ? null : (
            <Text as="p" tone="caption" className="text-danger" role="alert">
              {entries.error.message}
            </Text>
          )}

          <Panel>
            {entries.isPending ? (
              <div className="space-y-3 p-5 sm:p-6" aria-hidden="true">
                <div className="bg-surface-raised/60 h-3 w-1/3 animate-pulse rounded" />
                <div className="bg-surface-raised/60 h-3 w-2/3 animate-pulse rounded" />
              </div>
            ) : null}

            {rows.length === 0 && entries.isSuccess ? (
              <div className="space-y-2 p-5 sm:p-6">
                <PanelHead eyebrow="Register" title="Nothing matched" />
                <Text as="p" tone="muted">
                  Widen the filter, or write the first entry for this window.
                </Text>
              </div>
            ) : null}

            {rows.length === 0 ? null : (
              <EntryRegister entries={rows} accounts={index} scale={money.scale} />
            )}

            {entries.hasNextPage ? (
              <div className="border-border flex justify-center border-t p-4">
                <Button
                  tone="quiet"
                  size="sm"
                  loading={entries.isFetchingNextPage}
                  onClick={() => {
                    void entries.fetchNextPage()
                  }}
                >
                  Load more
                </Button>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  )
}
