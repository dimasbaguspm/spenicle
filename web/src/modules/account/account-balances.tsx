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
 *
 * The rows are the register's rows: the same uppercase column strip, the same grid, the same
 * hover, so a list of accounts reads like a list of entries.
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
    <div className="space-y-6">
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
          <Panel key={group.kind}>
            <div className="flex items-baseline justify-between gap-4 px-5 py-4 sm:px-6">
              <Text as="p" tone="section">
                {group.label}
              </Text>
              <Text as="p" tone="figure" className="text-text-muted text-xs">
                {total}
              </Text>
            </div>

            <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
              <span className="min-w-0 flex-1">Account</span>
              <span className="w-24 shrink-0">Kind</span>
              <span className="w-32 shrink-0 text-right">Balance</span>
            </div>

            <ul>
              {held.map((account) => (
                <li key={account.ref} className="border-border/70 border-t first:border-t-0">
                  <Link
                    to={detailPath[scope]}
                    params={{ ref: account.ref }}
                    className="hover:bg-surface-raised/60 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 text-sm transition-colors sm:grid-cols-[minmax(0,1fr)_6rem_8rem] sm:px-6"
                  >
                    <span className="text-text truncate">
                      {account.name}
                      {account.parent_ref === undefined ? null : (
                        <Text as="span" tone="caption" className="text-text-faint ml-2">
                          sub-account
                        </Text>
                      )}
                    </span>
                    <span className="hidden min-w-0 sm:block">
                      <span className="text-text-muted border-border inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[0.6875rem]">
                        {account.kind}
                      </span>
                    </span>
                    <Text as="span" tone="figure" className="text-right">
                      {formatMoney(account.base_amount_minor, scale.units).toDisplay()}
                    </Text>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )
      })}
    </div>
  )
}
