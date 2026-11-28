import { buttonStyles } from '@/components/primitives/button'
import { Text } from '@/components/primitives/text'
import { cn } from '@/lib/cn'
import { absent } from '@/lib/text'

import type { StatementRow } from './row'

/**
 * One statement, line by line, in the order the file listed them: the day, what it was, what the
 * upload made of it, and the two buttons that overrule it. A skipped row is a suggestion, not a
 * veto, which is why both buttons are always there while the draft is open.
 */
export function StatementTable({
  rows,
  open,
  onToggle,
}: {
  rows: readonly StatementRow[]
  open: boolean
  onToggle: (row: StatementRow) => void
}) {
  return (
    <>
      <div className="text-text-faint border-border hidden items-center gap-3 border-t px-6 py-2.5 text-[0.5625rem] tracking-[0.16em] uppercase sm:flex">
        <span className="w-24 shrink-0">Day</span>
        <span className="min-w-0 flex-1">Line</span>
        <span className="w-28 shrink-0 text-right">Amount</span>
        <span className="w-40 shrink-0" />
      </div>

      <ul>
        {rows.map((row) => (
          <li
            key={row.index}
            className="border-border/70 border-t px-4 py-3 text-sm first:border-t-0 sm:grid sm:grid-cols-[6rem_minmax(0,1fr)_7rem_10rem] sm:items-center sm:gap-3 sm:px-6"
          >
            <Text as="span" tone="figure" className="text-text-muted block text-xs">
              {row.day}
            </Text>

            <span className="min-w-0 space-y-0.5">
              <span className="text-text block truncate">{row.description}</span>
              <Text as="span" tone="caption" className="text-text-faint block">
                {row.category === absent
                  ? 'no category'
                  : `${row.category}${row.suggested ? ' (suggested)' : ''}`}
              </Text>
            </span>

            <Text
              as="span"
              tone="figure"
              className={cn(
                'mt-1 block text-right sm:mt-0',
                row.out ? 'text-text' : 'text-success',
              )}
            >
              {row.amount}
            </Text>

            <span className="mt-1 flex items-center justify-end gap-2 sm:mt-0">
              {row.clash === absent ? null : (
                <Text as="span" tone="caption" className="text-warning">
                  {row.clash}
                </Text>
              )}
              <span
                className={cn(
                  'inline-block rounded-full border border-current px-2 py-0.5 text-[0.6875rem] uppercase',
                  row.tone,
                )}
              >
                {row.status}
              </span>
              {open ? (
                <button
                  type="button"
                  className={cn(buttonStyles({ tone: 'quiet', size: 'sm' }))}
                  onClick={() => {
                    onToggle(row)
                  }}
                >
                  {row.status === 'accepted' ? 'Skip' : 'Accept'}
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
