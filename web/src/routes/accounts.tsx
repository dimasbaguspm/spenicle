import { useMemo } from 'react'

import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { useAccounts } from '@/hooks/queries/use-accounts'
import { useMoney } from '@/hooks/use-money'
import { AccountBalances } from '@/modules'

/** Every account the ledger knows, grouped the way accounting groups them, with its balance. */
export function AccountsPage() {
  const accounts = useAccounts({ limit: 200 })
  const money = useMoney()
  const rows = useMemo(() => accounts.data?.accounts ?? [], [accounts.data])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Text as="p" tone="section">
          Accounts
        </Text>
        <Text as="h1" tone="display">
          Balances
        </Text>
        <Text as="p" tone="muted">
          What each account holds, in {money.scale.currency}. Derived from the postings, never from
          a stored column.
        </Text>
      </header>

      {accounts.error === null ? null : (
        <Text as="p" tone="caption" className="text-oxblood-300" role="alert">
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
