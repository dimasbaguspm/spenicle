import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Pencil } from 'lucide-react'

import { buttonStyles } from '@/components/primitives/button'
import { PageHeader } from '@/components/primitives/page-header'
import { Text } from '@/components/primitives/text'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useMeta } from '@/hooks/queries/use-meta'
import { usePayees } from '@/hooks/queries/use-payees'
import { useEntryMovements } from '@/hooks/use-entry-movements'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/money'
import { absent } from '@/lib/text'
import { EntityHistory } from '@/components/ui/entity-history'
import { accountIndex, EntryMovements } from '@/modules'

/**
 * One account's movements, narrowed the way the register is narrowed: the account is pinned by
 * the route, the rest comes from the URL, and every row carries the balance it left behind.
 */
export function AccountDetailPage() {
  const { ref } = useParams({ from: '/manage/accounts/$ref' })
  const search = useSearch({ from: '/manage/accounts/$ref' })
  const navigate = useNavigate({ from: '/manage/accounts/$ref' })
  const meta = useMeta()
  const payees = usePayees()
  const money = useMoney()
  const held = useAccounts({ refs: ref, limit: 1 })

  const movements = useEntryMovements({
    search,
    onChange: (next) => {
      void navigate({ search: next, replace: true })
    },
    pinned: { account: ref },
    mode: 'account',
  })

  const accounts = meta.data?.accounts ?? []
  const account = held.data?.accounts[0]
  const payeeRows = payees.data?.payees ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        items={[
          { label: 'Manage', to: '/manage' },
          { label: 'Accounts', to: '/manage/accounts' },
          { label: account?.name ?? absent },
        ]}
        title={account?.name ?? absent}
        action={
          <div className="flex items-center gap-3">
            <Text as="p" tone="figure" className="text-2xl">
              {account === undefined
                ? absent
                : formatMoney(account.base_amount_minor, money.scale.units).toDisplay(
                    money.scale.currency,
                  )}
            </Text>
            <Link
              to="/manage/accounts/$ref/edit"
              params={{ ref }}
              className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
            >
              <Pencil className="size-3.5" aria-hidden="true" strokeWidth={1.75} />
              Edit
            </Link>
          </div>
        }
      />

      <EntryMovements
        mode="account"
        view={movements}
        accounts={accounts}
        payees={payeeRows}
        index={accountIndex(accounts)}
        scale={money.scale}
      />

      <EntityHistory kind="account" ref={ref} />
    </div>
  )
}
