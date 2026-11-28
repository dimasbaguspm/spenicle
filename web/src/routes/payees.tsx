import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { PageHeader } from '@/components/primitives/page-header'
import { buttonStyles } from '@/components/primitives/button'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePayees } from '@/hooks/queries/use-payees'
import { cn } from '@/lib/cn'
import { PayeeList, payeeRows } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const payeeCrumbs = [{ label: 'Payees' }] as const

export function PayeesPage() {
  const payees = usePayees({ limit: 200 })
  const meta = useMeta()

  const rows = payeeRows(payees.data?.payees ?? [], meta.data?.accounts ?? [])

  return (
    <div className="space-y-6">
      <PageHeader
        items={payeeCrumbs}
        title="Payees"
        action={
          <Link to="/payees/new" className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}>
            <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
            New payee
          </Link>
        }
      />

      {payees.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {payees.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <Text as="p" tone="muted">
              {payees.isPending ? 'Loading…' : 'No payees yet. A name is all one needs.'}
            </Text>
            {payees.isPending ? null : (
              <Link to="/payees/new" className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}>
                <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
                New payee
              </Link>
            )}
          </div>
        </Panel>
      ) : (
        <Panel>
          <PayeeList rows={rows} />
        </Panel>
      )}
    </div>
  )
}
