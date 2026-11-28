import type { Entry } from '@/api/types'
import { Text } from '@/components/primitives/text'
import type { MoneyScale } from '@/lib/money'
import type { AccountIndex } from '@/modules/account'

import { EntryAmount } from './entry-amount'
import { entryRow } from './row'

/** The same row, squeezed: the landing screen shows the day, the label and the figure only. */
export function EntryTicker({
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
    <ul>
      {rows.map((row) => (
        <li
          key={row.ref}
          className="border-ink-800/70 flex items-center gap-4 border-t px-5 py-3 text-sm first:border-t-0 sm:px-6"
        >
          <Text as="span" tone="figure" className="text-ink-400 w-16 shrink-0 text-xs">
            {row.day}
          </Text>
          <span className="text-porcelain-100 min-w-0 flex-1 truncate">{row.title}</span>
          <EntryAmount row={row} className="shrink-0 text-xs" />
        </li>
      ))}
    </ul>
  )
}
