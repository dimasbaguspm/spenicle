import { Link, useParams } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'
import { useMemo } from 'react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Button, buttonStyles } from '@/components/primitives/button'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useEntryPages } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { formatMoney } from '@/lib/money'
import { absent } from '@/lib/text'
import { accountIndex, AccountRegister } from '@/modules'

const listLimit = 50

/**
 * One category and what it filed. A category holds no money of its own: the number beside the
 * name is the total it moved, and the register is the same one every account gets.
 */
export function CategoryDetailPage() {
  const { ref } = useParams({ from: '/categories/$ref' })
  const meta = useMeta()
  const money = useMoney()
  const held = useAccounts({ refs: ref, limit: 1 })
  const entries = useEntryPages({ account_ref: ref, with_balance: 'true', limit: listLimit })

  const account = held.data?.accounts[0]
  const accounts = meta.data?.accounts ?? []
  const index = accountIndex(accounts)
  const rows = entries.data?.pages.flatMap((page) => page.entries) ?? []
  const crumbs = useMemo(
    () => [{ label: 'Categories', to: '/categories' }, { label: account?.name ?? absent }],
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
            {account?.kind ?? 'category'} category, in {money.scale.currency}. It files entries; it
            never holds money.
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
            to="/categories/$ref/edit"
            params={{ ref }}
            className={buttonStyles({ tone: 'quiet', size: 'sm' })}
          >
            <Pencil className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
            Edit
          </Link>
        </div>
      </header>

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
            Nothing was filed here yet.
          </Text>
        ) : null}

        {rows.length === 0 ? null : (
          <AccountRegister entries={rows} accounts={index} scale={money.scale} hideCategory />
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
  )
}
