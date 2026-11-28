import type { Account } from '@/api/types'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

import { accountGroups } from './kinds'

/** Every account, grouped the way accounting groups them, with its balance and its total. */
export function AccountBalances({
  accounts,
  scale,
}: {
  accounts: readonly Account[]
  scale: MoneyScale
}) {
  return (
    <Panel className="divide-ink-800 divide-y">
      {accountGroups.map((group) => {
        const held = accounts.filter((account) => account.kind === group.kind)
        if (held.length === 0) {
          return null
        }

        const total = formatMoney(
          sumMinor(held.map((account) => account.base_amount_minor)),
          scale.units,
        ).toDisplay()

        return (
          <section key={group.kind} className="space-y-1 px-5 py-4 sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <Text as="p" tone="section">
                {group.label}
              </Text>
              <Text as="p" tone="figure" className="text-ink-400 text-xs">
                {total}
              </Text>
            </div>
            <ul className="mt-1">
              {held.map((account) => (
                <li key={account.ref} className="flex items-baseline gap-4 py-1.5 text-sm">
                  <span className="text-porcelain-100 min-w-0 flex-1 truncate">{account.name}</span>
                  {account.parent_ref === undefined ? null : (
                    <Text as="span" tone="caption" className="text-ink-500">
                      sub-account
                    </Text>
                  )}
                  <Text as="span" tone="figure" className="w-32 shrink-0 text-right">
                    {formatMoney(account.base_amount_minor, scale.units).toDisplay()}
                  </Text>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </Panel>
  )
}
