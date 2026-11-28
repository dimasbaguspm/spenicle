import { Link } from '@tanstack/react-router'

import type { Account } from '@/api/types'
import { Panel } from '@/components/primitives/panel'
import { Text } from '@/components/primitives/text'
import { formatMoney, sumMinor, type MoneyScale } from '@/lib/money'

import { categoryGroups, moneyGroups, type AccountScope } from './kinds'

/** One screen per scope: a money row and a category row do not open the same page. */
const detailPath = {
  money: '/accounts/$ref',
  category: '/categories/$ref',
} as const

/**
 * Every account of one scope, grouped the way accounting groups them, with its balance and its
 * total. A category is an account too, so the two screens differ in the groups they ask for, not
 * in the list that draws them.
 */
export function AccountBalances({
  accounts,
  scale,
  scope,
}: {
  accounts: readonly Account[]
  scale: MoneyScale
  scope: AccountScope
}) {
  const groups = scope === 'category' ? categoryGroups : moneyGroups

  return (
    <Panel className="divide-border divide-y">
      {groups.map((group) => {
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
              <Text as="p" tone="figure" className="text-text-muted text-xs">
                {total}
              </Text>
            </div>
            <ul className="mt-1">
              {held.map((account) => (
                <li key={account.ref} className="text-sm">
                  <Link
                    to={detailPath[scope]}
                    params={{ ref: account.ref }}
                    className="hover:bg-surface-raised/50 -mx-2 flex items-baseline gap-4 rounded px-2 py-1.5"
                  >
                    <span className="text-text min-w-0 flex-1 truncate">{account.name}</span>
                    {account.parent_ref === undefined ? null : (
                      <Text as="span" tone="caption" className="text-text-faint">
                        sub-account
                      </Text>
                    )}
                    <Text as="span" tone="figure" className="w-32 shrink-0 text-right">
                      {formatMoney(account.base_amount_minor, scale.units).toDisplay()}
                    </Text>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </Panel>
  )
}
