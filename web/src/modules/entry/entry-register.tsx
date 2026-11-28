import type { Entry } from '@/api/types'
import { Text } from '@/components/primitives/text'
import type { MoneyScale } from '@/lib/money'
import type { AccountIndex } from '@/modules/account'

import { EntryAmount } from './entry-amount'
import { entryRow } from './row'

/** The register: one line per entry, in the column order a ledger reads in. */
export function EntryRegister({
  entries,
  accounts,
  scale,
}: {
  entries: readonly Entry[]
  accounts: AccountIndex
  scale: MoneyScale
}) {
  const rows = entries.map((entry) => entryRow(entry, accounts, scale))

  return (
    <>
      <div className="text-ink-500 border-ink-800/80 hidden items-center gap-3 border-t px-6 py-2.5 font-mono text-[0.5625rem] font-medium tracking-[0.16em] uppercase sm:flex">
        <span className="w-[5.5rem] shrink-0">Day</span>
        <span className="min-w-0 flex-1">Entry</span>
        <span className="w-20 shrink-0">Category</span>
        <span className="w-28 shrink-0 text-right">Amount · {scale.currency}</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li
            key={row.ref}
            className="border-ink-800/70 hover:bg-ink-800/30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t px-4 py-3.5 text-sm transition-colors first:border-t-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_5rem_7rem] sm:px-6"
          >
            <Text as="span" tone="figure" className="text-ink-400 order-3 text-xs sm:order-none">
              <time dateTime={row.iso} title={row.iso}>
                {row.day}
              </time>
            </Text>
            <span
              className="text-porcelain-100 order-1 min-w-0 truncate sm:order-none"
              title={row.title}
            >
              {row.title}
            </span>
            <Text
              as="span"
              tone="caption"
              className="text-ink-400 order-4 hidden min-w-0 truncate sm:order-none sm:block"
            >
              {row.category}
            </Text>
            <EntryAmount row={row} className="order-2 text-right sm:order-none" />
          </li>
        ))}
      </ul>
    </>
  )
}
