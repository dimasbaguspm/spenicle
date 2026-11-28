import { Link } from '@tanstack/react-router'

import type { Entry } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'
import { formatMoney, type MoneyScale } from '@/lib/money'
import type { AccountIndex } from '@/modules/account'

import { EntryAmount } from './entry-amount'
import { entryRow } from './row'

/** The category column earns its width on an account page; a category's own page would repeat it. */
const withCategory = 'sm:grid-cols-[5.5rem_minmax(0,1fr)_8rem_7rem_8rem]'
const withoutCategory = 'sm:grid-cols-[5.5rem_minmax(0,1fr)_7rem_8rem]'

/**
 * One account's register: the entries that moved through it, with the balance it held after
 * each. `with_balance=true` is what the API answers only for exactly one account, so this table
 * exists only here.
 */
export function AccountRegister({
  entries,
  accounts,
  scale,
  hideCategory = false,
}: {
  entries: readonly Entry[]
  accounts: AccountIndex
  scale: MoneyScale
  hideCategory?: boolean | undefined
}) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="w-[5.5rem] shrink-0">Day</span>
        <span className="min-w-0 flex-1">Entry</span>
        {hideCategory ? null : <span className="w-32 shrink-0">Category</span>}
        <span className="w-28 shrink-0 text-right">Amount</span>
        <span className="w-32 shrink-0 text-right">Balance</span>
      </div>
      <ul>
        {entries.map((entry) => {
          const row = entryRow(entry, accounts, scale)
          const balance =
            entry.running_balance_minor === undefined
              ? undefined
              : formatMoney(entry.running_balance_minor, scale.units).toDisplay()

          return (
            <li key={row.ref} className="border-border/70 border-t first:border-t-0">
              <Link
                to="/ledger/$ref"
                params={{ ref: row.ref }}
                className={cn(
                  'hover:bg-surface-raised/60 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition-colors sm:px-6',
                  hideCategory ? withoutCategory : withCategory,
                )}
              >
                <Text
                  as="span"
                  tone="figure"
                  className="text-text-faint order-3 text-xs sm:order-none"
                >
                  <time dateTime={row.iso}>{row.day}</time>
                </Text>
                <span className="text-text order-1 min-w-0 sm:order-none">
                  <span className="text-text block truncate">{row.title}</span>
                </span>
                {hideCategory ? null : (
                  <span className="order-4 hidden min-w-0 sm:order-none sm:block">
                    <span className="text-text-muted border-border inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[0.6875rem]">
                      {row.category}
                    </span>
                  </span>
                )}
                <EntryAmount row={row} className="order-2 text-right sm:order-none" />
                <Text
                  as="span"
                  tone="figure"
                  className="text-text-faint col-span-2 order-5 hidden text-right text-xs sm:order-none sm:col-span-1 sm:block"
                >
                  {balance ?? ''}
                </Text>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
