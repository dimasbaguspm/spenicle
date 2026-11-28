import { Link, useParams } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Button, buttonStyles } from '@/components/primitives/button'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useEntryPages } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePayees } from '@/hooks/queries/use-payees'
import { useMoney } from '@/hooks/use-money'
import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'
import { accountIndex, EntryRegister, payeeRows } from '@/modules'

const listLimit = 50

/** One payee: the defaults it carries, and the entries that mention it. */
export function PayeeDetailPage() {
  const { ref } = useParams({ from: '/payees/$ref' })
  const money = useMoney()
  const meta = useMeta()
  const held = usePayees({ refs: ref, limit: 1 })
  const entries = useEntryPages({ payee_ref: ref, limit: listLimit })

  const payee = held.data?.payees[0]
  const accounts = meta.data?.accounts ?? []
  const row = payeeRows(payee === undefined ? [] : [payee], accounts)[0]
  const rows = entries.data?.pages.flatMap((page) => page.entries) ?? []

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumb
            items={[{ label: 'Payees', to: '/payees' }, { label: row?.name ?? absent }]}
          />
          <Text as="h1" tone="display">
            {row?.name ?? absent}
          </Text>
          <Text as="p" tone="muted">
            {row?.archived === true
              ? 'Archived: it stays in the history, it just stops proposing.'
              : 'A name and the defaults it fills in.'}
          </Text>
        </div>
        <Link
          to="/payees/$ref/edit"
          params={{ ref }}
          className={buttonStyles({ tone: 'quiet', size: 'sm' })}
        >
          <Pencil className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
          Edit
        </Link>
      </header>

      <Panel>
        <dl className="divide-border grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Fact label="Default account" value={row?.account ?? absent} />
          <Fact label="Default category" value={row?.category ?? absent} />
          <Fact label="Added" value={formatDate(payee?.created_at, DateFormat.Day)} />
        </dl>
      </Panel>

      {entries.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {entries.error.message}
        </Text>
      )}

      <Panel>
        {rows.length === 0 && entries.isSuccess ? (
          <Text as="p" tone="muted" className="p-5 sm:p-6">
            Nothing references this payee yet.
          </Text>
        ) : null}

        {rows.length === 0 ? null : (
          <EntryRegister entries={rows} accounts={accountIndex(accounts)} scale={money.scale} />
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 px-5 py-4 sm:px-6">
      <dt>
        <Text as="span" tone="section">
          {label}
        </Text>
      </dt>
      <dd className="text-text text-sm">{value}</dd>
    </div>
  )
}
