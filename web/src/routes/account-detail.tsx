import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Pencil } from 'lucide-react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Button, buttonStyles } from '@/components/primitives/button'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useEntryPages } from '@/hooks/queries/use-entries'
import { useFilterQuery } from '@/hooks/use-filter-query'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { usePayees } from '@/hooks/queries/use-payees'
import { formatMoney } from '@/lib/money'
import { absent } from '@/lib/text'
import {
  AccountRegister,
  accountIndex,
  EntryFilterChips,
  EntryFilterRail,
  EntryFilterSheet,
  entryFilterSpec,
} from '@/modules'

const listLimit = 100

/**
 * One account's movements, filtered the same way the register is: the account is pinned by the
 * route, the rest comes from the URL, and every row carries the balance it left behind.
 */
export function AccountDetailPage() {
  const { ref } = useParams({ from: '/accounts/$ref' })
  const search = useSearch({ from: '/accounts/$ref' })
  const navigate = useNavigate({ from: '/accounts/$ref' })
  const meta = useMeta()
  const payees = usePayees()
  const money = useMoney()

  const pinned = { account: ref }
  const filters = useFilterQuery({
    search,
    onChange: (next) => {
      void navigate({ search: next, replace: true })
    },
    spec: entryFilterSpec,
    limit: listLimit,
    pinned,
  })

  const entries = useEntryPages({ ...filters.query, with_balance: 'true' })
  const held = useAccounts({ refs: ref, limit: 1 })

  const accounts = meta.data?.accounts ?? []
  const index = accountIndex(accounts)
  const rows = entries.data?.pages.flatMap((page) => page.entries) ?? []
  const payeeRows = payees.data?.payees ?? []
  const account = held.data?.accounts[0]
  const crumbs = useMemo(
    () => [{ label: 'Accounts', to: '/accounts' }, { label: account?.name ?? absent }],
    [account?.name],
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumb items={crumbs} />
          <Text as="h1" tone="display">
            {account?.name ?? absent}
          </Text>
          <Text as="p" tone="muted">
            {account?.kind ?? 'account'} held in {money.scale.currency}, newest movement first.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <Text as="p" tone="figure" className="text-2xl">
            {account === undefined
              ? absent
              : formatMoney(account.base_amount_minor, money.scale.units).toDisplay(
                  money.scale.currency,
                )}
          </Text>
          <Link
            to="/accounts/$ref/edit"
            params={{ ref }}
            className={buttonStyles({ tone: 'quiet', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
            Edit
          </Link>
        </div>
      </header>

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
              {rows.length === 0 ? 'nothing matched' : `${String(rows.length)} movements`}
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
              <Text as="p" tone="muted" className="p-5 sm:p-6">
                Nothing moved in this window.
              </Text>
            ) : null}

            {rows.length === 0 ? null : (
              <AccountRegister entries={rows} accounts={index} scale={money.scale} />
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
