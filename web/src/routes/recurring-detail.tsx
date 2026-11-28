import { Link, useParams } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'

import { Button, buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePatchRecurring, useRecurring } from '@/hooks/queries/use-recurring'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { absent } from '@/lib/text'
import { recurringRow } from '@/modules'

/**
 * One rule, whole: the schedule it repeats on, what it pays and from where, and the two things a
 * person does to it — pause it while the world changes, or open the edit page and correct it.
 */
export function RecurringDetailPage() {
  const { ref } = useParams({ from: '/manage/recurring/$ref' })
  const meta = useMeta()
  const money = useMoney()
  const patch = usePatchRecurring()
  const held = useRecurring({ refs: ref, limit: 1 })

  const rule = held.data?.recurring[0]
  const accounts = meta.data?.accounts ?? []
  const payees = meta.data?.payees ?? []
  const row = rule === undefined ? undefined : recurringRow(rule, payees, accounts, money.scale)

  const category = accounts.find((account) => account.ref === rule?.category_ref)
  const account = accounts.find((item) => item.ref === rule?.account_ref)
  const payee = payees.find((item) => item.ref === rule?.payee_ref)

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Recurring', to: '/manage/recurring' },
        ]}
        title={row?.title ?? 'Recurring rule'}
        subtitle="The schedule, and the two things you can do to it."
        action={
          <Link
            to="/manage/recurring/$ref/edit"
            params={{ ref }}
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Pencil className="size-3.5" aria-hidden="true" strokeWidth={2} />
            Edit
          </Link>
        }
      />

      {held.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {held.error.message}
        </Text>
      )}

      {held.isPending ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              Loading
            </Text>
          </div>
        </Panel>
      ) : rule === undefined ? (
        <Panel>
          <div className="p-5 sm:p-6">
            <Text as="p" tone="muted">
              No rule with that reference.
            </Text>
          </div>
        </Panel>
      ) : (
        <>
          <Panel>
            <div className="space-y-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <Text as="p" tone="section">
                  {row?.schedule}
                </Text>
                <Text as="p" tone="figure" className="text-2xl">
                  {row?.amount}
                </Text>
              </div>

              <dl className="border-border grid gap-y-2 border-t pt-3 text-sm">
                <Fact label="State" value={rule.state} />
                <Fact label="Paid to" value={payee?.name ?? absent} />
                <Fact label="Paid from" value={account?.name ?? absent} />
                <Fact label="Category" value={category?.name ?? 'uncategorised'} />
                <Fact label="Next due" value={rule.next_due_on} />
                <Fact label="Ends on" value={rule.ends_on ?? absent} />
                <Fact label="Ref" value={rule.ref} mono />
              </dl>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  tone="quiet"
                  size="sm"
                  loading={patch.isPending}
                  onClick={() => {
                    patch.mutate({
                      ref,
                      body: { state: row?.running === true ? 'paused' : 'active' },
                    })
                  }}
                >
                  {row?.running === true ? 'Pause' : 'Resume'}
                </Button>
              </div>

              {patch.error === null ? null : (
                <Text as="p" tone="caption" className="text-danger" role="alert">
                  {patch.error.message}
                </Text>
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-text-faint text-xs">{label}</dt>
      <dd className={cn('text-text truncate text-xs', mono === true && 'font-mono')}>{value}</dd>
    </div>
  )
}
