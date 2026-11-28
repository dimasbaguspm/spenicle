import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Panel } from '@/components/primitives/panel'
import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { buttonStyles } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useMoney } from '@/hooks/use-money'
import { cn } from '@/lib/cn'
import { AccountBalances, accountScope, type AccountScope } from '@/modules'

/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const accountCrumbs = [{ label: 'Accounts' }] as const
const categoryCrumbs = [{ label: 'Categories' }] as const

/** What you hold and what you owe: the balance sheet, nothing that names a purpose. */
export function AccountsPage() {
  return (
    <ScopePage
      scope="money"
      title="Accounts"
      crumbs={accountCrumbs}
      description="What the money sits in. A balance here is derived from the postings, never typed in."
      emptyLabel="No accounts yet: an entry needs one to be paid from."
      newLabel="New account"
      newTo="/accounts/new"
      otherLabel="Categories are on their own screen."
      otherTo="/categories"
    />
  )
}

/** What the money was for. A category is an account of kind expense or income, and holds nothing. */
export function CategoriesPage() {
  return (
    <ScopePage
      scope="category"
      title="Categories"
      crumbs={categoryCrumbs}
      description="What money was for, not where it sits. Every entry touches one account and one of these."
      emptyLabel="No categories yet: nothing can be filed without one."
      newLabel="New category"
      newTo="/categories/new"
      otherLabel="Accounts hold the money itself."
      otherTo="/accounts"
    />
  )
}

type ScopePageProps = {
  scope: AccountScope
  title: string
  crumbs: readonly { label: string }[]
  description: string
  emptyLabel: string
  newLabel: string
  newTo: '/accounts/new' | '/categories/new'
  otherLabel: string
  otherTo: '/accounts' | '/categories'
}

/** The two index screens differ in the groups they ask for and the words they say, nothing else. */
function ScopePage({
  scope,
  title,
  crumbs,
  description,
  emptyLabel,
  newLabel,
  newTo,
  otherLabel,
  otherTo,
}: ScopePageProps) {
  const accounts = useAccounts({ limit: 200 })
  const money = useMoney()

  const rows = (accounts.data?.accounts ?? []).filter(
    (account) => accountScope(account.kind) === scope,
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumb items={crumbs} />
          <Text as="h1" tone="display">
            {title}
          </Text>
          <Text as="p" tone="muted" className="max-w-prose">
            {description}
          </Text>
        </div>
        <Link to={newTo} className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}>
          <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
          {newLabel}
        </Link>
      </header>

      {accounts.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {accounts.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <div className="space-y-3 p-5 sm:p-6">
            <Text as="p" tone="muted">
              {accounts.isPending ? 'Loading…' : emptyLabel}
            </Text>
            {accounts.isPending ? null : (
              <Link to={newTo} className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}>
                <Plus className="size-3.5" aria-hidden="true" strokeWidth={2} />
                {newLabel}
              </Link>
            )}
          </div>
        </Panel>
      ) : (
        <AccountBalances accounts={rows} scale={money.scale} scope={scope} />
      )}

      <Text as="p" tone="caption" className="text-text-faint">
        {otherLabel}{' '}
        <Link to={otherTo} className="hover:text-text underline underline-offset-4">
          Open {otherTo === '/categories' ? 'categories' : 'accounts'}
        </Link>
      </Text>
    </div>
  )
}
