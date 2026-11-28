import { Panel } from '@/components/primitives/panel'
import { Breadcrumb } from '@/components/primitives/breadcrumb'
import { Text } from '@/components/primitives/text'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useMoney } from '@/hooks/use-money'
import { AccountBalances } from '@/modules'

/** Every account the ledger knows, grouped the way accounting groups them, with its balance. */
/** Stable crumbs: a new array on every render would re-render the trail for nothing. */
const accountCrumbs = [{ label: 'Accounts' }] as const

export function AccountsPage() {
  const accounts = useAccounts({ limit: 200 })
  const money = useMoney()
  const rows = accounts.data?.accounts ?? []

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Breadcrumb items={accountCrumbs} />
        <Text as="h1" tone="display">
          Balances
        </Text>
      </header>

      {accounts.error === null ? null : (
        <Text as="p" tone="caption" className="text-danger" role="alert">
          {accounts.error.message}
        </Text>
      )}

      {rows.length === 0 ? (
        <Panel>
          <Text as="p" tone="muted" className="p-5 sm:p-6">
            {accounts.isPending ? 'Loading…' : 'No accounts yet.'}
          </Text>
        </Panel>
      ) : (
        <AccountBalances accounts={rows} scale={money.scale} />
      )}
    </div>
  )
}
