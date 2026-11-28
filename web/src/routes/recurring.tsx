import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import { buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { DebounceForm, TextField } from '@/components/ui/form'
import { useMeta } from '@/hooks/queries/use-meta'
import { useRecurring } from '@/hooks/queries/use-recurring'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { RecurringList, recurringRow } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const recurringCrumbs = [{ label: 'Manage', to: '/manage' }, { label: 'Recurring' }] as const

/**
 * What repeats, soonest first. The list searches and the list links: creating, correcting and
 * pausing a rule each have a page of their own, because a schedule deserves a deliberate change.
 */
export function RecurringPage() {
  const [query, setQuery] = useState('')
  const rules = useRecurring({
    limit: 200,
    ...(query.trim() === '' ? {} : { query: query.trim() }),
  })
  const meta = useMeta()
  const money = useMoney()

  const accounts = meta.data?.accounts ?? []
  const payees = meta.data?.payees ?? []
  const rows = (rules.data?.recurring ?? []).map((rule) =>
    recurringRow(rule, payees, accounts, money.scale),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        items={recurringCrumbs}
        title="What repeats"
        subtitle="A due rule queues a capture; approval is still yours."
        action={
          <Link
            to="/manage/recurring/new"
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
            New rule
          </Link>
        }
      />

      <DebounceForm<{ q: string }>
        className="max-w-sm"
        defaultValues={{ q: '' }}
        onDebounce={(values) => {
          setQuery(values.q)
        }}
      >
        {() => <TextField<{ q: string }> name="q" label="Search" placeholder="Search payees" />}
      </DebounceForm>

      {rules.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {rules.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <Text as="p" tone="muted">
              {rules.isPending
                ? 'Loading'
                : 'Nothing repeats yet. A rule needs a payee, an account, an amount and a day.'}
            </Text>
            {rules.isPending ? null : (
              <Link
                to="/manage/recurring/new"
                className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
              >
                <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
                New rule
              </Link>
            )}
          </div>
        </Panel>
      ) : (
        <Panel>
          <RecurringList rows={rows} />
        </Panel>
      )}
    </div>
  )
}
