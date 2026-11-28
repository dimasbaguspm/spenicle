import { Link } from '@tanstack/react-router'

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
        <li key={row.ref} className="border-border/70 border-t first:border-t-0">
          <Link
            to="/ledger/$ref"
            params={{ ref: row.ref }}
            className="hover:bg-surface-raised/60 flex items-center gap-4 px-5 py-3 text-sm transition-colors sm:px-6"
          >
            <Text as="span" tone="figure" className="text-text-muted w-16 shrink-0 text-xs">
              {row.day}
            </Text>
            <span className="text-text min-w-0 flex-1 truncate">{row.title}</span>
            <EntryAmount row={row} className="shrink-0 text-xs" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
