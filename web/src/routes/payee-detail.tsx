import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'

import { buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePayees } from '@/hooks/queries/use-payees'
import { useEntryMovements } from '@/hooks/use-entry-movements'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { DateFormat, formatDate } from '@/lib/date'
import { absent } from '@/lib/text'
import { accountIndex, EntryMovements, payeeRows } from '@/modules'

/** One payee: the defaults it carries, and everything paid to it, narrowed like the register. */
export function PayeeDetailPage() {
  const { ref } = useParams({ from: '/manage/payees/$ref' })
  const search = useSearch({ from: '/manage/payees/$ref' })
  const navigate = useNavigate({ from: '/manage/payees/$ref' })
  const money = useMoney()
  const meta = useMeta()
  const held = usePayees({ refs: ref, limit: 1 })

  const movements = useEntryMovements({
    search,
    onChange: (next) => {
      void navigate({ search: next, replace: true })
    },
    pinned: { payee: ref },
    mode: 'payee',
  })

  const payee = held.data?.payees[0]
  const accounts = meta.data?.accounts ?? []
  const row = payeeRows(payee === undefined ? [] : [payee], accounts)[0]

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Payees', to: '/manage/payees' },
        ]}
        title={row?.name ?? absent}
        subtitle="What this payee cost, and at which accounts."
        action={
          <Link
            to="/manage/payees/$ref/edit"
            params={{ ref }}
            className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
          >
            <Pencil className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
            Edit
          </Link>
        }
      />

      <Panel>
        <dl className="divide-border grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Fact label="Default account" value={row?.account ?? absent} />
          <Fact label="Default category" value={row?.category ?? absent} />
          <Fact
            label={row?.archived === true ? 'Archived, added' : 'Added'}
            value={formatDate(payee?.created_at, DateFormat.Day)}
          />
        </dl>
      </Panel>

      <EntryMovements
        mode="payee"
        view={movements}
        accounts={accounts}
        payees={payee === undefined ? [] : [payee]}
        index={accountIndex(accounts)}
        scale={money.scale}
      />
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
