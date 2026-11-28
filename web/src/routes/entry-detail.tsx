import { Link, useParams } from '@tanstack/react-router'
import { Pencil, Undo2 } from 'lucide-react'
import { useState } from 'react'

import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Button, buttonStyles } from '@/components/primitives/button'
import { Dialog } from '@/components/primitives/dialog'
import { Field } from '@/components/primitives/field'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { TextInput } from '@/components/primitives/text-input'
import { useEntityAudit, useLedgerAudit } from '@/hooks/queries/use-audit'
import { useEntry, usePatchEntry } from '@/hooks/queries/use-entries'
import { useMeta } from '@/hooks/queries/use-meta'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { accountIndex, EntryDetail, EntryTimeline, timelineRows } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const entryCrumbs = [
  { label: 'Ledger', to: '/ledger' },
  { label: 'Register', to: '/ledger' },
  { label: 'Entry' },
] as const

/**
 * One entry, whole: its postings, the accounts behind them and the metadata a row cannot hold.
 *
 * Nothing in this ledger is deleted. Taking an entry back is a reversal: a mirror entry cancels
 * it, both stay in the journal, and the pair is what the audit trail reads later.
 */
export function EntryDetailPage() {
  const { ref } = useParams({ from: '/ledger/$ref' })
  const entry = useEntry(ref)
  const meta = useMeta()
  const money = useMoney()
  const audit = useEntityAudit('ledger_entry', ref)
  const scan = useLedgerAudit()

  const accounts = accountIndex(meta.data?.accounts ?? [])
  const reversed = entry.data?.reversed_at !== undefined

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Breadcrumb items={entryCrumbs} />
        <div className="flex items-center gap-2">
          <Link
            to="/ledger/$ref/edit"
            params={{ ref }}
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Pencil className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
            Edit
          </Link>
          {reversed ? null : <ReverseAction entryRef={ref} />}
        </div>
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
        <>
          <EntryDetail entry={entry.data} accounts={accounts} scale={money.scale} />

          <Panel>
            <div className="border-border border-b px-5 py-4 sm:px-6">
              <Text as="p" tone="section">
                Timeline
              </Text>
            </div>
            <EntryTimeline
              rows={timelineRows([...(audit.data?.audit ?? []), ...(scan.data?.audit ?? [])], ref)}
            />
          </Panel>
        </>
      )}
    </div>
  )
}

/**
 * The delete this product has: a dialog that says what will happen, an optional reason that lands
 * in the journal, and a mirror entry that does the cancelling.
 */
function ReverseAction({ entryRef }: { entryRef: string }) {
  const patch = usePatchEntry()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Reverse this entry?"
      description="It is not erased. A mirror entry cancels it, both stay in the ledger, and the reports stop counting it."
      trigger={
        <Button tone="quiet" size="sm" className="text-danger hover:text-danger">
          <Undo2 className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
          Reverse
        </Button>
      }
      footer={
        <Button
          tone="danger"
          size="sm"
          loading={patch.isPending}
          onClick={() => {
            patch.mutate(
              { ref: entryRef, body: { reverse: true, ...(reason === '' ? {} : { reason }) } },
              {
                onSuccess: () => {
                  setOpen(false)
                  setReason('')
                },
              },
            )
          }}
        >
          Reverse entry
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Reason">
          <TextInput
            value={reason}
            placeholder="wrong amount, duplicate, refunded"
            autoComplete="off"
            onChange={(event) => {
              setReason(event.target.value)
            }}
          />
        </Field>
        {patch.error === null ? null : (
          <Text as="p" tone="caption" className="text-danger" role="alert">
            {patch.error.message}
          </Text>
        )}
        <Text as="p" tone="caption" className="text-text-faint">
          Reversing cannot be undone here; the ledger keeps both rows.
        </Text>
      </div>
    </Dialog>
  )
}
