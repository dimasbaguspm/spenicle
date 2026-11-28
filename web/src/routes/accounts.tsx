import { useAccounts } from '@/hooks/queries/use-accounts'
import { useMoney } from '@/hooks/use-money'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'

const kinds = [
  { kind: 'asset', label: 'Assets' },
  { kind: 'liability', label: 'Liabilities' },
  { kind: 'equity', label: 'Equity' },
  { kind: 'expense', label: 'Expense categories' },
  { kind: 'income', label: 'Income categories' },
] as const

/** Every account the ledger knows, grouped the way accounting groups them, with its balance. */
export function AccountsPage() {
  const accounts = useAccounts({ limit: 200 })
  const money = useMoney()
  const rows = accounts.data?.accounts ?? []

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
          What each account holds, in {money.currency}. Derived from the postings, never from a
          stored column.
        </Text>
      </header>

      {accounts.error === null ? null : (
        <Text as="p" tone="caption" className="text-oxblood-300" role="alert">
          {accounts.error.message}
        </Text>
      )}

      <Panel className="divide-ink-800 divide-y">
        {kinds.map((group) => {
          const held = rows.filter((row) => row.kind === group.kind)
          if (held.length === 0) {
            return null
          }

          const total = held.reduce((sum, row) => sum + Number(row.base_amount_minor ?? '0'), 0)

          return (
            <section key={group.kind} className="space-y-1 px-5 py-4 sm:px-6">
              <div className="flex items-baseline justify-between gap-4">
                <Text as="p" tone="section">
                  {group.label}
                </Text>
                <Text as="p" tone="figure" className="text-ink-400 text-xs">
                  {money.figure(String(total))}
                </Text>
              </div>
              <ul className="mt-1">
                {held.map((row) => (
                  <li key={row.ref} className="flex items-baseline gap-4 py-1.5 text-sm">
                    <span className="text-porcelain-100 min-w-0 flex-1 truncate">{row.name}</span>
                    {row.parent_ref === undefined ? null : (
                      <Text as="span" tone="caption" className="text-ink-500">
                        sub-account
                      </Text>
                    )}
                    <Text as="span" tone="figure" className="w-32 shrink-0 text-right">
                      {money.figure(row.base_amount_minor ?? '0')}
                    </Text>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {rows.length === 0 && accounts.isPending ? (
          <Text as="p" tone="muted" className="p-5 sm:p-6">
            Loading…
          </Text>
        ) : null}
      </Panel>
    </div>
  )
}
