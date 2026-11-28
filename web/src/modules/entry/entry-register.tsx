import { Link } from '@tanstack/react-router'

import type { Entry } from '@/api/types'
import { Text } from '@/components/primitives/text'
import { InlineEdit } from '@/components/ui/form'
import type { MoneyScale } from '@/lib/money'
import type { AccountIndex } from '@/modules/account'

import { EntryAmount } from './entry-amount'
import { entryRow } from './row'

/**
 * The register: one line per entry, in the column order a ledger reads in. The account the money
 * moved through sits under the label, the category sits in a chip, so the two never look alike.
 */
export function EntryRegister({
  entries,
  accounts,
  scale,
  onEditNote,
}: {
  entries: readonly Entry[]
  accounts: AccountIndex
  scale: MoneyScale
  onEditNote?: ((ref: string, note: string) => void) | undefined
}) {
  const rows = entries.map((entry) => entryRow(entry, accounts, scale))

  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] font-medium tracking-[0.16em] uppercase sm:flex">
        <span className="w-[5.5rem] shrink-0">Day</span>
        <span className="min-w-0 flex-1">Entry</span>
        <span className="w-32 shrink-0">Category</span>
        <span className="w-28 shrink-0 text-right">Amount ({scale.currency})</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.ref} className="border-border/70 border-t first:border-t-0">
            <Link
              to="/ledger/$ref"
              params={{ ref: row.ref }}
              className="hover:bg-surface-raised/60 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition-colors sm:grid-cols-[5.5rem_minmax(0,1fr)_8rem_7rem] sm:px-6"
            >
              <Text
                as="span"
                tone="figure"
                className="text-text-faint order-3 text-xs sm:order-none"
              >
                <time dateTime={row.iso} title={row.iso}>
                  {row.day}
                </time>
              </Text>
              <span className="order-1 min-w-0 sm:order-none">
                {onEditNote === undefined ? (
                  <span className="text-text block truncate">{row.title}</span>
                ) : (
                  <InlineEdit
                    value={row.note}
                    onSave={(next) => {
                      onEditNote(row.ref, next)
                    }}
                  />
                )}
                <span className="text-text-faint block truncate text-[0.6875rem]">
                  {row.account}
                </span>
              </span>
              <span className="order-4 hidden min-w-0 sm:order-none sm:block">
                <span className="text-text-muted border-border inline-block max-w-full truncate rounded-full border px-2 py-0.5 text-[0.6875rem]">
                  {row.category}
                </span>
              </span>
              <EntryAmount row={row} className="order-2 text-right sm:order-none" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
