import { Link, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Pencil } from 'lucide-react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { buttonStyles } from '@/components/primitives/button'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useEntry, usePatchEntry } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { accountIndex, EntryDetail } from '@/modules'

/** One entry, whole: its postings, the accounts behind them and the metadata a row cannot hold. */
/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const entryCrumbs = [
  { label: 'Ledger', to: '/ledger' },
  { label: 'Register', to: '/ledger' },
  { label: 'Entry' },
] as const

export function EntryDetailPage() {
  const { ref } = useParams({ from: '/ledger/$ref' })
  const entry = useEntry(ref)
  const rename = usePatchEntry()
  const meta = useMeta()
  const money = useMoney()

  const accounts = useMemo(() => accountIndex(meta.data?.accounts ?? []), [meta.data])

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Breadcrumb items={entryCrumbs} />
        <Link
          to="/ledger/$ref/edit"
          params={{ ref }}
          className={buttonStyles({ tone: 'quiet', size: 'sm' })}
        >
          <Pencil className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
          Edit
        </Link>
      </header>

      {entry.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {entry.error.message}
        </Text>
      )}

      {entry.data === undefined ? (
        entry.isPending ? (
          <Panel className="space-y-3 p-6" aria-hidden="true">
            <div className="bg-surface-raised/60 h-4 w-1/3 animate-pulse rounded" />
            <div className="bg-surface-raised/60 h-4 w-2/3 animate-pulse rounded" />
          </Panel>
        ) : null
      ) : (
        <EntryDetail
          entry={entry.data}
          accounts={accounts}
          scale={money.scale}
          onEditNote={(entryRef, note) => {
            rename.mutate({ ref: entryRef, body: { note } })
          }}
        />
      )}
    </div>
  )
}
